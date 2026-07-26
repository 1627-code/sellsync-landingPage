#!/usr/bin/env python3
"""
Google Authentication Configuration Checker for SellSync
This script verifies that your Google OAuth authentication is properly configured.
"""

import os
import sys
from pathlib import Path

def check_environment():
    """Check environment variables"""
    print("🔍 Checking environment configuration...")
    
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("⚠️  python-dotenv not available, checking system environment")
    
    # Check Google Client ID
    google_client_id = os.getenv('GOOGLE_CLIENT_ID', '')
    if google_client_id and google_client_id != 'your_google_client_id_here':
        print(f"✅ GOOGLE_CLIENT_ID is set: {google_client_id[:20]}...")
        return True
    else:
        print("❌ GOOGLE_CLIENT_ID is not configured or is using placeholder value")
        return False

def check_google_auth_library():
    """Check if google-auth library is available"""
    print("📚 Checking Google Auth library...")
    
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        print("✅ Google Auth library is available!")
        return True
    except ImportError as e:
        print(f"❌ Google Auth library not available: {e}")
        return False

def check_backend_routes():
    """Check if backend routes are defined"""
    print("🌐 Checking backend routes...")
    
    server_file = Path('contact_server.py')
    if not server_file.exists():
        print("❌ contact_server.py not found")
        return False
    
    with open(server_file, 'r') as f:
        content = f.read()
    
    # Check for Google routes
    if '/api/config/google' in content:
        print("✅ Google config endpoint found")
    else:
        print("❌ Google config endpoint not found")
        return False
    
    if '/auth/google' in content:
        print("✅ Google auth endpoint found")
    else:
        print("❌ Google auth endpoint not found")
        return False
    
    return True

def check_frontend_integration():
    """Check if frontend is properly integrated"""
    print("🎨 Checking frontend integration...")
    
    # Check login.html
    login_html = Path('login.html')
    if not login_html.exists():
        print("❌ login.html not found")
        return False
    
    with open(login_html, 'r') as f:
        content = f.read()
    
    # Check for Google Sign-In script
    if 'https://accounts.google.com/gsi/client' in content:
        print("✅ Google Sign-In script found in login.html")
    else:
        print("❌ Google Sign-In script not found in login.html")
        return False
    
    # Check for Google auth elements
    if 'g_id_signin' in content:
        print("✅ Google Sign-In button element found")
    else:
        print("❌ Google Sign-In button element not found")
        return False
    
    # Check login.js
    login_js = Path('login.js')
    if not login_js.exists():
        print("❌ login.js not found")
        return False
    
    with open(login_js, 'r') as f:
        js_content = f.read()
    
    if 'handleGoogleCredentialResponse' in js_content:
        print("✅ Google credential handler found in login.js")
    else:
        print("❌ Google credential handler not found in login.js")
        return False
    
    if 'initializeGoogleSignIn' in js_content:
        print("✅ Google Sign-In initialization found")
    else:
        print("❌ Google Sign-In initialization not found")
        return False
    
    return True

def check_css_styling():
    """Check if CSS styles are available"""
    print("🎨 Checking CSS styling...")
    
    login_css = Path('login.css')
    if not login_css.exists():
        print("❌ login.css not found")
        return False
    
    with open(login_css, 'r') as f:
        content = f.read()
    
    # Check for Google auth styles
    if '.google-auth' in content:
        print("✅ Google auth styles found")
    else:
        print("❌ Google auth styles not found")
        return False
    
    if '.auth-divider' in content:
        print("✅ Auth divider styles found")
    else:
        print("❌ Auth divider styles not found")
        return False
    
    return True

def main():
    """Main check function"""
    print("🔧 Google Authentication Configuration Checker")
    print("=" * 50)
    
    checks = [
        ("Environment", check_environment),
        ("Google Auth Library", check_google_auth_library),
        ("Backend Routes", check_backend_routes),
        ("Frontend Integration", check_frontend_integration),
        ("CSS Styling", check_css_styling),
    ]
    
    passed = 0
    total = len(checks)
    
    for name, check_func in checks:
        print(f"\n--- {name} ---")
        if check_func():
            passed += 1
            print(f"✅ {name} check passed")
        else:
            print(f"❌ {name} check failed")
    
    print("\n" + "=" * 50)
    print(f"Results: {passed}/{total} checks passed")
    
    if passed == total:
        print("🎉 All checks passed! Google authentication should be working.")
        print("\nNext steps:")
        print("1. Make sure your Flask server is running")
        print("2. Test the Google login button on your login page")
        print("3. Check browser console for any JavaScript errors")
    else:
        print("⚠️  Some checks failed. Please review the issues above.")
        print("\nCommon issues:")
        print("- Missing Google Client ID in .env file")
        print("- Google Auth library not installed")
        print("- Frontend integration not complete")
        print("- Backend routes not properly configured")

if __name__ == "__main__":
    main()#!/usr/bin/env python3
"""
Google Authentication Configuration Checker for SellSync
This script verifies that your Google OAuth authentication is properly configured.
"""

import os
import sys
from pathlib import Path

def check_environment():
    """Check environment variables"""
    print("🔍 Checking environment configuration...")
    
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("⚠️  python-dotenv not available, checking system environment")
    
    # Check Google Client ID
    google_client_id = os.getenv('GOOGLE_CLIENT_ID', '')
    if google_client_id and google_client_id != 'your_google_client_id_here':
        print(f"✅ GOOGLE_CLIENT_ID is set: {google_client_id[:20]}...")
        return True
    else:
        print("❌ GOOGLE_CLIENT_ID is not configured or is using placeholder value")
        return False

def check_google_auth_library():
    """Check if google-auth library is available"""
    print("📚 Checking Google Auth library...")
    
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        print("✅ Google Auth library is available!")
        return True
    except ImportError as e:
        print(f"❌ Google Auth library not available: {e}")
        return False

def check_backend_routes():
    """Check if backend routes are defined"""
    print("🌐 Checking backend routes...")
    
    server_file = Path('contact_server.py')
    if not server_file.exists():
        print("❌ contact_server.py not found")
        return False
    
    with open(server_file, 'r') as f:
        content = f.read()
    
    # Check for Google routes
    if '/api/config/google' in content:
        print("✅ Google config endpoint found")
    else:
        print("❌ Google config endpoint not found")
        return False
    
    if '/auth/google' in content:
        print("✅ Google auth endpoint found")
    else:
        print("❌ Google auth endpoint not found")
        return False
    
    return True

def check_frontend_integration():
    """Check if frontend is properly integrated"""
    print("🎨 Checking frontend integration...")
    
    # Check login.html
    login_html = Path('login.html')
    if not login_html.exists():
        print("❌ login.html not found")
        return False
    
    with open(login_html, 'r') as f:
        content = f.read()
    
    # Check for Google Sign-In script
    if 'https://accounts.google.com/gsi/client' in content:
        print("✅ Google Sign-In script found in login.html")
    else:
        print("❌ Google Sign-In script not found in login.html")
        return False
    
    # Check for Google auth elements
    if 'g_id_signin' in content:
        print("✅ Google Sign-In button element found")
    else:
        print("❌ Google Sign-In button element not found")
        return False
    
    # Check login.js
    login_js = Path('login.js')
    if not login_js.exists():
        print("❌ login.js not found")
        return False
    
    with open(login_js, 'r') as f:
        js_content = f.read()
    
    if 'handleGoogleCredentialResponse' in js_content:
        print("✅ Google credential handler found in login.js")
    else:
        print("❌ Google credential handler not found in login.js")
        return False
    
    if 'initializeGoogleSignIn' in js_content:
        print("✅ Google Sign-In initialization found")
    else:
        print("❌ Google Sign-In initialization not found")
        return False
    
    return True

def check_css_styling():
    """Check if CSS styles are available"""
    print("🎨 Checking CSS styling...")
    
    login_css = Path('login.css')
    if not login_css.exists():
        print("❌ login.css not found")
        return False
    
    with open(login_css, 'r') as f:
        content = f.read()
    
    # Check for Google auth styles
    if '.google-auth' in content:
        print("✅ Google auth styles found")
    else:
        print("❌ Google auth styles not found")
        return False
    
    if '.auth-divider' in content:
        print("✅ Auth divider styles found")
    else:
        print("❌ Auth divider styles not found")
        return False
    
    return True

def main():
    """Main check function"""
    print("🔧 Google Authentication Configuration Checker")
    print("=" * 50)
    
    checks = [
        ("Environment", check_environment),
        ("Google Auth Library", check_google_auth_library),
        ("Backend Routes", check_backend_routes),
        ("Frontend Integration", check_frontend_integration),
        ("CSS Styling", check_css_styling),
    ]
    
    passed = 0
    total = len(checks)
    
    for name, check_func in checks:
        print(f"\n--- {name} ---")
        if check_func():
            passed += 1
            print(f"✅ {name} check passed")
        else:
            print(f"❌ {name} check failed")
    
    print("\n" + "=" * 50)
    print(f"Results: {passed}/{total} checks passed")
    
    if passed == total:
        print("🎉 All checks passed! Google authentication should be working.")
        print("\nNext steps:")
        print("1. Make sure your Flask server is running")
        print("2. Test the Google login button on your login page")
        print("3. Check browser console for any JavaScript errors")
    else:
        print("⚠️  Some checks failed. Please review the issues above.")
        print("\nCommon issues:")
        print("- Missing Google Client ID in .env file")
        print("- Google Auth library not installed")
        print("- Frontend integration not complete")
        print("- Backend routes not properly configured")

if __name__ == "__main__":
    main()