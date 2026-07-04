import os
import traceback
from flask import Flask, jsonify, render_template, request
from google.cloud import storage
import google.auth
from google.auth.exceptions import DefaultCredentialsError

app = Flask(__name__)

# Attempt to load Google Cloud default credentials and project ID
def get_gcp_status():
    try:
        credentials, project = google.auth.default()
        # Fallback if project is not resolved by default credentials
        if not project or project == "outside-of-project":
            project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT") or "my-first-project"
        return {
            "authenticated": True,
            "project_id": project,
            "error": None
        }
    except DefaultCredentialsError as e:
        return {
            "authenticated": False,
            "project_id": os.environ.get("GOOGLE_CLOUD_PROJECT") or "my-first-project",
            "error": str(e)
        }
    except Exception as e:
        return {
            "authenticated": False,
            "project_id": "my-first-project",
            "error": f"Unexpected error: {str(e)}"
        }

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/status", methods=["GET"])
def api_status():
    status = get_gcp_status()
    return jsonify(status)

@app.route("/api/buckets", methods=["GET"])
def list_buckets():
    status = get_gcp_status()
    project_id = status["project_id"]
    
    if not status["authenticated"]:
        return jsonify({
            "success": False,
            "error": "Authentication credentials not found. Please set up Application Default Credentials (ADC).",
            "details": status["error"]
        }), 401
        
    try:
        # Initialize Google Cloud Storage client with resolved project
        storage_client = storage.Client(project=project_id)
        buckets = list(storage_client.list_buckets())
        bucket_names = [bucket.name for bucket in buckets]
        return jsonify({
            "success": True,
            "project_id": project_id,
            "buckets": bucket_names
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Failed to connect or list buckets: {str(e)}",
            "project_id": project_id
        }), 500

@app.route("/api/buckets/create", methods=["POST"])
def create_bucket():
    status = get_gcp_status()
    project_id = status["project_id"]
    
    if not status["authenticated"]:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
        
    data = request.get_json() or {}
    bucket_name = data.get("bucket_name")
    
    if not bucket_name:
        return jsonify({"success": False, "error": "Bucket name is required"}), 400
        
    try:
        storage_client = storage.Client(project=project_id)
        bucket = storage_client.create_bucket(bucket_name)
        return jsonify({
            "success": True,
            "message": f"Bucket '{bucket.name}' created successfully!",
            "bucket_name": bucket.name
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to create bucket: {str(e)}"
        }), 500

@app.route("/api/buckets/upload", methods=["POST"])
def upload_file():
    status = get_gcp_status()
    project_id = status["project_id"]
    
    if not status["authenticated"]:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
        
    bucket_name = request.form.get("bucket_name")
    uploaded_file = request.files.get("file")
    
    if not bucket_name or not uploaded_file:
        return jsonify({"success": False, "error": "Bucket name and file are required"}), 400
        
    try:
        storage_client = storage.Client(project=project_id)
        bucket = storage_client.get_bucket(bucket_name)
        blob = bucket.blob(uploaded_file.filename)
        
        # Upload from stream
        blob.upload_from_file(uploaded_file.stream, content_type=uploaded_file.content_type)
        
        return jsonify({
            "success": True,
            "message": f"File '{uploaded_file.filename}' uploaded successfully to bucket '{bucket_name}'!",
            "file_name": uploaded_file.filename
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to upload file: {str(e)}"
        }), 500

if __name__ == "__main__":
    # Host on 0.0.0.0 and port 5000, or use PORT env var (important for Heroku)
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
