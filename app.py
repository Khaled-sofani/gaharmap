# -*- coding: utf-8 -*-
"""
GAHAR Health Map Dashboard — Flask Backend (SQLite Version)
Uses SQLite (database.db) for free hosting compatibility.
Run: python app.py   →  http://localhost:5000
"""

from flask import Flask, jsonify, render_template, request, send_file
import sqlite3
import json
import os
import io
import pandas as pd

app = Flask(__name__)

# ─── Database Configuration ────────────────────────────────────────────────
# Use a local SQLite file for all environments.
DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def get_connection():
    """Establish a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This allows accessing columns by name
    return conn


# ─── Routes ────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Serve the main dashboard page."""
    return render_template("index.html")


@app.route("/api/data")
def api_data():
    """Return all facilities as JSON. Supports optional ?accredited=1 filter."""
    accredited_only = request.args.get("accredited", "0") == "1"
    try:
        conn = get_connection()
        cursor = conn.cursor()

        if accredited_only:
            # SQLite uses '%' for LIKE and handles NULLs similarly to MySQL
            query = """
                SELECT * FROM `minya_data`
                WHERE (`تاريخ_التسجيل` IS NOT NULL AND `تاريخ_التسجيل` != '')
                   OR (`نوع_الاعتماد` LIKE '%مبدئي%')
            """
        else:
            query = "SELECT * FROM `minya_data`"

        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        # Convert SQLite Row objects to dictionaries
        clean_rows = []
        for row in rows:
            clean_row = {}
            for k in row.keys():
                # Normalise key: spaces → underscores (same as before)
                norm_key = k.replace(' ', '_')
                v = row[k]
                if v is None:
                    clean_row[norm_key] = ""
                else:
                    # SQLite types are usually clean, but we ensure string for complex types
                    clean_row[norm_key] = str(v) if not isinstance(v, (int, float, str, bool)) else v
            clean_rows.append(clean_row)

        return jsonify({"status": "success", "data": clean_rows})

    except sqlite3.Error as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/tables")
def api_tables():
    """List available tables in the SQLite database (debug helper)."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "tables": tables})
    except sqlite3.Error as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/export_excel", methods=["POST"])
def api_export_excel():
    """Receive JSON array and return an Excel file."""
    try:
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
            
        df = pd.DataFrame(data)
        
        output = io.BytesIO()
        # Use openpyxl or xlsxwriter. xlsxwriter gives good control over RTL.
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='المنشآت الصحية', index=False)
            
            # Setup RTL for the sheet
            worksheet = writer.sheets['المنشآت الصحية']
            worksheet.right_to_left()
            
        output.seek(0)
        
        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name="GAHAR_Export.xlsx"
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ─── Entry Point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  GAHAR Health Map Dashboard — Python/Flask (SQLite)")
    print(f"  Database: {DB_PATH}")
    print("  Open:  http://localhost:5050")
    print("=" * 60)
    app.run(debug=True, host="0.0.0.0", port=5050)
