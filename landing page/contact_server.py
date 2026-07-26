"""
SellSync Contact & Schedule-a-Call API
Sends form submissions to sellsynctechnology@gmail.com via Gmail SMTP.
Run: python contact_server.py
Then open http://localhost:5050/business.html

Set env vars (or .env):
  SMTP_USER       – Gmail address (e.g. your@gmail.com)
  SMTP_PASSWORD   – Gmail App Password (not normal password)
  CONTACT_TO      – Recipient (default: sellsynctechnology@gmail.com)
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
from openai import OpenAI

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from authlib.integrations.flask_client import OAuth
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
except ImportError:
    google_id_token = None
    google_requests = None
    OAuth = None

try:
    import jwt
except ImportError:
    jwt = None

app = Flask(__name__, static_folder=Path(__file__).resolve().parent)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', os.urandom(24).hex())

# Vercel-compatible session configuration
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PREFERRED_URL_SCHEME'] = 'https'

CONTACT_TO = os.environ.get('CONTACT_TO', 'sellsynctechnology@gmail.com')
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
JWT_SECRET = os.environ.get('JWT_SECRET', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
VERCEL_URL = os.environ.get('VERCEL_URL', 'localhost:5050')
BASE_URL = f"https://{VERCEL_URL}" if 'localhost' not in VERCEL_URL else f"http://{VERCEL_URL}"

# Initialize Authlib OAuth if available
oauth = None
if OAuth and GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth = OAuth(app)
    google = oauth.register(
        name='google',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        access_token_url='https://accounts.google.com/o/oauth2/token',
        authorize_url='https://accounts.google.com/o/oauth2/auth',
        api_base_url='https://www.googleapis.com/oauth2/v1/',
        userinfo_endpoint='https://openidconnect.googleapis.com/v1/userinfo',
        client_kwargs={'scope': 'openid email profile'},
    )

# Initialize OpenAI client
client = None
if OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)

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


@app.route('/api/subscribe', methods=['POST'])
def api_subscribe():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip()
    if not email:
        return jsonify({'ok': False, 'error': 'Email is required.'}), 400
    ts = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')
    body = f"""New Newsletter Subscription – SellSync

Email: {email}

Submitted: {ts}
"""
    ok, err = send_email(
        subject=f'SellSync Newsletter Subscription: {email}',
        body_text=body,
    )
    if not ok:
        return jsonify({'ok': False, 'error': err or 'Failed to send.'}), 500
    return jsonify({'ok': True})

@app.route('/api/config/google', methods=['GET'])
def api_google_config():
    return jsonify({'clientId': GOOGLE_CLIENT_ID or ''})


@app.route('/auth/google', methods=['GET', 'POST'])
def auth_google():
    """Initiate Google OAuth flow - supports both server-side and client-side flows"""
    # Support server-side OAuth flow with Authlib
    if oauth and request.method == 'GET':
        try:
            redirect_uri = url_for('google_callback', _external=True)
            print(f"[OAuth] Initiating flow with redirect URI: {redirect_uri}")
            return google.authorize_redirect(redirect_uri)
        except Exception as e:
            print(f"[OAuth] Initiation error: {str(e)}")
            return jsonify({'success': False, 'error': 'Failed to start authentication.', 'details': str(e)}), 500
    
    # Original client-side flow (works with Google Sign-In button)
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
        print(f"[OAuth] Successfully verified token for user: {payload.get('email')}")
    except Exception as e:
        print(f"[OAuth] Token verification failed: {str(e)}")
        return jsonify({'success': False, 'error': 'Invalid Google credential.', 'details': str(e)}), 401

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
        from datetime import datetime, timedelta
        token = jwt.encode(
            {
                'sub': user['googleId'], 
                'email': user['email'], 
                'name': user['name'],
                'exp': datetime.utcnow() + timedelta(days=7)
            },
            JWT_SECRET,
            algorithm='HS256'
        )
        if isinstance(token, bytes):
            token = token.decode('utf-8')

    return jsonify({'success': True, 'user': user, 'token': token})


@app.route('/auth/google/callback')
def google_callback():
    """Handle Google OAuth callback for server-side flow"""
    if not oauth:
        return redirect('/login.html?error=oauth_not_configured')
    
    try:
        token = google.authorize_access_token()
        userinfo = google.parse_id_token(token)
        print(f"[OAuth Callback] User authenticated: {userinfo.get('email')}")
        
        # Store user in session
        session['user'] = userinfo
        
        # Generate JWT token
        if jwt and JWT_SECRET:
            from datetime import datetime, timedelta
            app_token = jwt.encode({
                'sub': userinfo['sub'],
                'email': userinfo['email'],
                'name': userinfo.get('name', ''),
                'picture': userinfo.get('picture', ''),
                'exp': datetime.utcnow() + timedelta(days=7)
            }, JWT_SECRET, algorithm='HS256')
            if isinstance(app_token, bytes):
                app_token = app_token.decode('utf-8')
            return redirect(f'/dashboard.html?token={app_token}')
        
        return redirect('/dashboard.html')
        
    except Exception as e:
        print(f"[OAuth Callback] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return redirect('/login.html?error=auth_failed')


# Add debug routes for troubleshooting
@app.route('/api/debug/oauth', methods=['GET'])
def debug_oauth():
    """Debug endpoint to check OAuth configuration"""
    return jsonify({
        'google_client_id_configured': bool(GOOGLE_CLIENT_ID),
        'google_client_secret_configured': bool(GOOGLE_CLIENT_SECRET),
        'authlib_available': OAuth is not None,
        'oauth_initialized': oauth is not None,
        'base_url': BASE_URL,
        'callback_url': url_for('google_callback', _external=True),
        'vercel_url': VERCEL_URL
    })


@app.route('/api/user/me', methods=['GET'])
def get_current_user():
    """Get current authenticated user's information"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        # Check session first
        if 'user' in session:
            return jsonify({'success': True, 'user': session['user'], 'source': 'session'})
        return jsonify({'success': False, 'error': 'Missing or invalid authorization'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        if not jwt or not JWT_SECRET:
            raise ValueError("JWT not configured")
            
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return jsonify({
            'success': True,
            'user': {
                'id': payload['sub'],
                'email': payload['email'],
                'name': payload['name'],
                'picture': payload.get('picture', '')
            },
            'source': 'jwt'
        })
    except jwt.ExpiredSignatureError:
        return jsonify({'success': False, 'error': 'Token expired'}), 401
    except jwt.InvalidTokenError as e:
        print(f"[JWT] Invalid token: {str(e)}")
        return jsonify({'success': False, 'error': 'Invalid token'}), 401
    except Exception as e:
        print(f"[User API] Error: {str(e)}")
        return jsonify({'success': False, 'error': 'Authentication failed'}), 500


@app.route('/api/chat', methods=['POST'])
def api_chat():
    data = request.get_json() or {}
    user_message = (data.get('message') or '').strip()

    if not user_message:
        return jsonify({'reply': 'Please provide a message.'}), 400

    if not client:
        return jsonify({'reply': 'AI assistant is currently unavailable (missing API key).'}), 503

    try:
        system_prompt = """You are the official AI assistant for SellSync. 
SellSync is a sales and inventory management platform designed to help businesses track products, manage inventory, and monitor sales. 
Your role is to help visitors understand what SellSync is and how it can help their business.

SellSync helps businesses:
- track inventory
- record sales
- manage products
- monitor business performance
It is designed for retail shops, small businesses, supermarkets, and online sellers.
The goal of SellSync is to make sales tracking and inventory management easier and more efficient.

SellSync was created by a team of experienced software developers and retail experts. The platform was designed by a team of UI/UX experts with a focus on creating a simple and intuitive user experience.

You should:
- Explain SellSync features clearly
- Answer questions about the platform
- Guide users to create an account by suggesting [Create Account]
- Suggest exploring the features page by suggesting [View Features]
- Suggest seeing pricing by suggesting [See Pricing]

Keep answers short, clear, and friendly.
Do not attempt to access user accounts or perform actions inside the app.
"""
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=200,
            temperature=0.7
        )
        reply = response.choices[0].message.content
        return jsonify({'reply': reply})
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return jsonify({'reply': "I'm sorry, I'm having trouble processing your request right now."}), 500


@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'business.html')


@app.route('/<path:path>')
def static_file(path):
    if path.startswith('api/') or path.startswith('/auth/'):
        return jsonify({'error': 'Not found'}), 404
    return send_from_directory(app.static_folder, path)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)