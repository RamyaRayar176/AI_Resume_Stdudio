import os
import sys
from pathlib import Path

# Add backend directory to path so database module can be found
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

try:
    import dotenv
    dotenv.load_dotenv(BASE_DIR / ".env")
except ImportError:
    print("Warning: python-dotenv not installed. Using environment variables as-is.")

def test_connection():
    print("=" * 60)
    print(" DATABASE CONNECTION TESTER ")
    print("=" * 60)

    # 1. Check if mysql-connector-python is installed
    mysql_connector_installed = False
    try:
        import mysql.connector
        mysql_connector_installed = True
        print("[OK] mysql-connector-python is installed.")
    except ImportError:
        print("[FAIL] mysql-connector-python is NOT installed.")

    # 2. Check if .env configuration exists
    host = os.getenv("MYSQL_HOST")
    user = os.getenv("MYSQL_USER")
    database = os.getenv("MYSQL_DATABASE")
    password = os.getenv("MYSQL_PASSWORD")
    port = os.getenv("MYSQL_PORT", "3306")

    print("\nEnvironment Configuration (from .env):")
    print(f"  - MYSQL_HOST:     {host}")
    print(f"  - MYSQL_USER:     {user}")
    print(f"  - MYSQL_DATABASE: {database}")
    print(f"  - MYSQL_PORT:     {port}")
    print(f"  - MYSQL_PASSWORD: {'*' * len(password) if password else 'None'}")

    # 3. Try MySQL connection if configured
    mysql_connected = False
    if mysql_connector_installed and all([host, user, database]):
        print("\nAttempting MySQL connection...")
        try:
            conn = mysql.connector.connect(
                host=host,
                user=user,
                password=password or "",
                database=database,
                port=int(port)
            )
            print("[OK] SUCCESS: Connected to MySQL database!")
            print(f"    Server version: {conn.server_info}")
            conn.close()
            mysql_connected = True
        except Exception as e:
            print(f"[FAIL] FAILED: Could not connect to MySQL.")
            print(f"    Error detail: {e}")
    else:
        print("\nMySQL connection skipped because either credentials are missing in .env or mysql-connector-python is missing.")

    # 4. Try SQLite connection (Fallback)
    print("\nAttempting SQLite connection (Local Fallback)...")
    try:
        import sqlite3
        sqlite_path = BASE_DIR / "backend" / "placement.db"
        print(f"  - SQLite DB Path: {sqlite_path}")
        conn = sqlite3.connect(sqlite_path)
        print("[OK] SUCCESS: Connected to local SQLite database!")
        conn.close()
    except Exception as e:
        print(f"[FAIL] FAILED: Could not connect to local SQLite database.")
        print(f"    Error detail: {e}")

    # 5. Summary
    print("\n" + "=" * 60)
    if mysql_connected:
        print(" STATUS: The project is CURRENTLY CONNECTED to your MySQL database.")
    else:
        print(" STATUS: The project will FALL BACK to the local SQLite database.")
    print("=" * 60)

if __name__ == "__main__":
    test_connection()
