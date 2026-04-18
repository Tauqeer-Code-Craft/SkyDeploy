import os
import subprocess
import sys
from pathlib import Path

PORT = int(os.getenv("PORT", 3000))


def log(msg):
    """Print log messages immediately."""
    print(msg, flush=True)


def run(cmd, exit_on_fail=True):
    """Run a shell command and optionally exit if it fails."""
    log(f"Running: {cmd}")
    process = subprocess.Popen(cmd, shell=True, env=os.environ)
    retcode = process.wait()
    if retcode != 0:
        log(f"❌ Command failed: {cmd} (exit code {retcode})")
        if exit_on_fail:
            sys.exit(retcode)
    return retcode


def install_deps():
    """Install dependencies from requirements.txt if it exists."""
    req_file = Path("requirements.txt")
    if req_file.exists():
        log("Installing Python dependencies...")
        run(f"pip install --no-cache-dir -r {req_file}")


def is_django():
    return Path("manage.py").exists()


def is_streamlit():
    """Detect Streamlit apps, including cases where app.py is used."""
    req_file = Path("requirements.txt")
    has_streamlit_in_reqs = req_file.exists() and "streamlit" in req_file.read_text().lower()
    return Path("streamlit_app.py").exists() or (Path("app.py").exists() and has_streamlit_in_reqs)


def is_fastapi():
    req_file = Path("requirements.txt")
    return req_file.exists() and "fastapi" in req_file.read_text().lower()


def is_flask():
    req_file = Path("requirements.txt")
    return req_file.exists() and "flask" in req_file.read_text().lower()


def start_app():
    """Detect app type and start it."""
    # Django
    if is_django():
        log("Detected Django app")
        run(f"python manage.py migrate", exit_on_fail=True)
        run(f"python manage.py runserver 0.0.0.0:{PORT}")

    # Streamlit
    elif is_streamlit():
        log("Detected Streamlit app")
        entrypoint = "streamlit_app.py" if Path("streamlit_app.py").exists() else "app.py"
        run(f"streamlit run {entrypoint} --server.port {PORT} --server.address 0.0.0.0")

    # FastAPI
    elif is_fastapi():
        log("Detected FastAPI app")
        module = "main:app" if Path("main.py").exists() else "app:app"
        run(f"uvicorn {module} --host 0.0.0.0 --port {PORT}")

    # Flask
    elif is_flask():
        log("Detected Flask app")
        os.environ.setdefault("FLASK_APP", "app.py")
        run(f"flask run --host=0.0.0.0 --port={PORT}")

    # Generic Python apps
    elif Path("main.py").exists():
        log("Running generic Python app: main.py")
        run("python main.py")
    elif Path("app.py").exists():
        log("Running generic Python app: app.py")
        run("python app.py")
    else:
        log("❌ No recognizable Python entrypoint found")
        sys.exit(1)


def main():
    install_deps()
    start_app()


if __name__ == "__main__":
    main()
