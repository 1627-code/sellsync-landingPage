"""
SellSync Contact & Schedule-a-Call API
Sends form submissions to danielaliyu06@gmail.com via Gmail SMTP.
Run: python contact_server.py
Then open http://localhost:5050/business.html

Set env vars (or .env):
  SMTP_USER       – Gmail address (e.g. your@gmail.com)
  SMTP_PASSWORD   – Gmail App Password (not normal password)
  CONTACT_TO      – Recipient (default: danielaliyu06@gmail.com)
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
except ImportError:
    google_id_token = None
    google_requests = None

try:
    import jwt
except ImportError:
    jwt = None

app = Flask(__name__, static_folder=Path(__file__).resolve().parent)
CONTACT_TO = os.environ.get('CONTACT_TO', 'danielaliyu06@gmail.com')
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
JWT_SECRET = os.environ.get('JWT_SECRET', '')


def send_email(subject, body_text, attachment_filename=None, attachment_content=None):
    if not SMTP_USER or not SMTP_PASSWORD:
        return False, 'Email not configured. Set SMTP_USER and SMTP_PASSWORD.'
    msg = MIMEMultipart()
    msg['Subject'] = subject
    msg['From'] = SMTP_USER
    msg['To'] = CONTACT_TO
    msg.attach(MIMEText(body_text, 'plain'))
    if attachment_filename and attachment_content:
        part = MIMEBase('application', 'octet-stream')
        part.set_payload(attachment_content.encode('utf-8'))
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f'attachment; filename="{attachment_filename}"')
        msg.attach(part)
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as s:
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.sendmail(SMTP_USER, [CONTACT_TO], msg.as_string())
        return True, None
    except Exception as e:
        return False, str(e)


@app.route('/api/contact', methods=['POST'])
def api_contact():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    inquiry = (data.get('inquiry') or '').strip()
    message = (data.get('message') or '').strip()
    consent = data.get('consent') is True
    if not name or not email or not message:
        return jsonify({'ok': False, 'error': 'Please fill in name, email, and message.'}), 400
    if not consent:
        return jsonify({'ok': False, 'error': 'Please accept the privacy policy to continue.'}), 400
    ts = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')
    body = f"""Get in Touch – SellSync

Name: {name}
Email: {email}
Inquiry: {inquiry or '(not selected)'}
Message:
{message}

Submitted: {ts}
"""
    file_content = f"Contact form submission\n{'='*40}\n{body}"
    ok, err = send_email(
        subject=f'SellSync Contact: {inquiry or "General"} – {name}',
        body_text=body,
        attachment_filename='sellsync_contact.txt',
        attachment_content=file_content,
    )
    if not ok:
        return jsonify({'ok': False, 'error': err or 'Failed to send.'}), 500
    return jsonify({'ok': True})


@app.route('/api/schedule-call', methods=['POST'])
def api_schedule_call():
    data = request.get_json() or {}
    name = (data.get('fullName') or '').strip()
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()
    business_name = (data.get('businessName') or '').strip()
    business_type = (data.get('businessType') or '').strip()
    intent = data.get('intent') or []
    if isinstance(intent, str):
        intent = [intent] if intent else []
    prefer_date = (data.get('preferDate') or '').strip()
    prefer_time = (data.get('preferTime') or '').strip()
    extra = (data.get('extra') or '').strip()
    if not name or not email or not phone or not business_name or not business_type:
        return jsonify({'ok': False, 'error': 'Please fill in all required fields.'}), 400
    if not prefer_date or not prefer_time:
        return jsonify({'ok': False, 'error': 'Please select preferred date and time.'}), 400
    ts = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')
    intent_str = ', '.join(intent) if intent else '(none)'
    body = f"""Schedule a Call – SellSync

Full Name: {name}
Email: {email}
Phone: {phone}
Business Name: {business_name}
Business Type: {business_type}
What would you like to discuss? {intent_str}
Preferred Date: {prefer_date}
Preferred Time: {prefer_time}
Anything else: {extra or '(none)'}

Submitted: {ts}
"""
    file_content = f"Schedule a call request\n{'='*40}\n{body}"
    ok, err = send_email(
        subject=f'SellSync Schedule Call: {business_name} – {name}',
        body_text=body,
        attachment_filename='sellsync_schedule_call.txt',
        attachment_content=file_content,
    )
    if not ok:
        return jsonify({'ok': False, 'error': err or 'Failed to send.'}), 500
    return jsonify({'ok': True})


@app.route('/auth/google', methods=['POST'])
def auth_google():
    data = request.get_json() or {}
    credential = (data.get('credential') or '').strip()
    if not credential:
        return jsonify({'success': False, 'error': 'Missing credential.'}), 400
    if not GOOGLE_CLIENT_ID:
        return jsonify({'success': False, 'error': 'Server is missing GOOGLE_CLIENT_ID configuration.'}), 500
    if google_id_token is None or google_requests is None:
        return jsonify({'success': False, 'error': 'Google auth library not installed. Install google-auth.'}), 500

    try:
        req = google_requests.Request()
        payload = google_id_token.verify_oauth2_token(credential, req, GOOGLE_CLIENT_ID)
    except Exception:
        return jsonify({'success': False, 'error': 'Invalid Google credential.'}), 401

    email_verified = payload.get('email_verified') is True
    if not email_verified:
        return jsonify({'success': False, 'error': 'Google email is not verified.'}), 401

    user = {
        'googleId': payload.get('sub'),
        'email': payload.get('email'),
        'name': payload.get('name') or payload.get('given_name') or '',
        'picture': payload.get('picture') or '',
        'email_verified': True,
    }

    token = None
    if jwt and JWT_SECRET:
        token = jwt.encode(
            {'sub': user['googleId'], 'email': user['email'], 'name': user['name']},
            JWT_SECRET,
            algorithm='HS256'
        )
        if isinstance(token, bytes):
            token = token.decode('utf-8')

    return jsonify({'success': True, 'user': user, 'token': token})


@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'business.html')


@app.route('/<path:path>')
def static_file(path):
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    return send_from_directory(app.static_folder, path)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)
