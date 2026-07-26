#!/usr/bin/env python3
"""
Google Authentication Setup Script for SellSync
This script helps you set up Google OAuth authentication for your application.
"""

import os
import sys
import subprocess
from pathlib import Path

def install_requirements():
    """Install required packages from requirements.txt"""
    print("📦 Installing required packages...")
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✅ Requirements installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False

def check_google_auth():
    """Check if google-auth is properly installed"""
    print("🔍 Checking Google Auth library...")
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        print("✅ Google Auth library is available!")
        return True
    except ImportError:
        print("❌ Google Auth library not found. Installing...")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'google-auth>=2.0'])
            print("✅ Google Auth library installed!")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to install Google Auth library")
            return False

def create_env_file():
    """Create .env file from .env.example if it doesn't exist"""
    env_file = Path('.env')
    example_file = Path('.env.example')
    
    if not env_file.exists() and example_file.exists():
        print("📝 Creating .env file from .env.example...")
        try:
            with open(example_file, 'r') as src, open(env_file, 'w') as dst:
                dst.write(src.read())
            print("✅ .env file created!")
            print("⚠️  Please edit .env file with your actual configuration values")
            return True
        except Exception as e:
            print(f"❌ Failed to create .env file: {e}")
            return False
    elif env_file.exists():
        print("✅ .env file already exists")
        return True
    else:
        print("❌ .env.example file not found")
        return False

def check_env_configuration():
    """Check if Google Client ID is configured"""
    print("🔐 Checking Google Client ID configuration...")
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        google_client_id = os.getenv('GOOGLE_CLIENT_ID', '')
        if google_client_id and google_client_id != 'your_google_client_id_here':
            print(f"✅ Google Client ID is configured: {google_client_id[:20]}...")
            return True
        else:
            print("❌ Google Client ID is not configured")
            print("📝 Please set GOOGLE_CLIENT_ID in your .env file")
            print("📋 To get a Google Client ID:")
            print("   1. Go to https://console.cloud.google.com/apis/credentials")
            print("   2. Create a new OAuth 2.0 Client ID")
            print("   3. Add your domain to authorized JavaScript origins")
            print("   4. Add your redirect URI to authorized redirect URIs")
            return False
    except Exception as e:
        print(f"❌ Error checking configuration: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Setting up Google Authentication for SellSync")
    print("=" * 50)
    
    # Check if requirements are installed
    if not install_requirements():
        print("❌ Setup failed at requirements installation")
        return False
    
    # Check Google Auth library
    if not check_google_auth():
        print("❌ Setup failed at Google Auth check")
        return False
    
    # Create .env file if needed
    if not create_env_file():
        print("❌ Setup failed at .env file creation")
        return False
    
    # Check configuration
    check_env_configuration()
    
    print("\n" + "=" * 50)
    print("✅ Setup completed!")
    print("\nNext steps:")
    print("1. Edit .env file with your actual configuration")
    print("2. Get Google Client ID from Google Cloud Console")
    print("3. Start your Flask server: python contact_server.py")
    print("4. Test Google login on your login page")
    
    return True

if __name__ == "__main__":
    main()#!/usr/bin/env python3
"""
Google Authentication Setup Script for SellSync
This script helps you set up Google OAuth authentication for your application.
"""

import os
import sys
import subprocess
from pathlib import Path

def install_requirements():
    """Install required packages from requirements.txt"""
    print("📦 Installing required packages...")
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✅ Requirements installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False

def check_google_auth():
    """Check if google-auth is properly installed"""
    print("🔍 Checking Google Auth library...")
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        print("✅ Google Auth library is available!")
        return True
    except ImportError:
        print("❌ Google Auth library not found. Installing...")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'google-auth>=2.0'])
            print("✅ Google Auth library installed!")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to install Google Auth library")
            return False

def create_env_file():
    """Create .env file from .env.example if it doesn't exist"""
    env_file = Path('.env')
    example_file = Path('.env.example')
    
    if not env_file.exists() and example_file.exists():
        print("📝 Creating .env file from .env.example...")
        try:
            with open(example_file, 'r') as src, open(env_file, 'w') as dst:
                dst.write(src.read())
            print("✅ .env file created!")
            print("⚠️  Please edit .env file with your actual configuration values")
            return True
        except Exception as e:
            print(f"❌ Failed to create .env file: {e}")
            return False
    elif env_file.exists():
        print("✅ .env file already exists")
        return True
    else:
        print("❌ .env.example file not found")
        return False

def check_env_configuration():
    """Check if Google Client ID is configured"""
    print("🔐 Checking Google Client ID configuration...")
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        google_client_id = os.getenv('GOOGLE_CLIENT_ID', '')
        if google_client_id and google_client_id != 'your_google_client_id_here':
            print(f"✅ Google Client ID is configured: {google_client_id[:20]}...")
            return True
        else:
            print("❌ Google Client ID is not configured")
            print("📝 Please set GOOGLE_CLIENT_ID in your .env file")
            print("📋 To get a Google Client ID:")
            print("   1. Go to https://console.cloud.google.com/apis/credentials")
            print("   2. Create a new OAuth 2.0 Client ID")
            print("   3. Add your domain to authorized JavaScript origins")
            print("   4. Add your redirect URI to authorized redirect URIs")
            return False
    except Exception as e:
        print(f"❌ Error checking configuration: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Setting up Google Authentication for SellSync")
    print("=" * 50)
    
    # Check if requirements are installed
    if not install_requirements():
        print("❌ Setup failed at requirements installation")
        return False
    
    # Check Google Auth library
    if not check_google_auth():
        print("❌ Setup failed at Google Auth check")
        return False
    
    # Create .env file if needed
    if not create_env_file():
        print("❌ Setup failed at .env file creation")
        return False
    
    # Check configuration
    check_env_configuration()
    
    print("\n" + "=" * 50)
    print("✅ Setup completed!")
    print("\nNext steps:")
    print("1. Edit .env file with your actual configuration")
    print("2. Get Google Client ID from Google Cloud Console")
    print("3. Start your Flask server: python contact_server.py")
    print("4. Test Google login on your login page")
    
    return True

if __name__ == "__main__":
    main()