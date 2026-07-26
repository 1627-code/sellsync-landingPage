# Google OAuth Setup Guide for SellSync

This guide will walk you through completing the Google OAuth setup for your SellSync application.

## ✅ What You've Already Done

✅ Created OAuth 2.0 Client ID in Google Cloud Console  
✅ Set up the backend Flask routes (`/auth/google`, `/api/config/google`)  
✅ Added Google login HTML and JavaScript to your frontend  
✅ CSS styling is ready for the Google login button  

## 🔧 Next Steps

### 1. Update Your .env File

Run the update script to add your Google Client ID:

```bash
python update_google_client_id.py
```

This script will:
- Prompt you for your Google Client ID
- Generate a secure JWT secret
- Update your .env file automatically

### 2. Configure Authorized Origins in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID
3. Click on it to edit
4. Under "Authorized JavaScript origins", add:
   - `http://localhost:5000` (for local development)
   - `https://yourdomain.com` (for production)
5. Under "Authorized redirect URIs", add:
   - `http://localhost:5000/auth/google`
   - `https://yourdomain.com/auth/google`
6. Save the changes

### 3. Test Your Setup

1. Start your Flask server:
   ```bash
   python contact_server.py
   ```

2. Open your browser and go to:
   ```
   http://localhost:5000/login.html
   ```

3. You should now see the Google login button below the regular login form

4. Click the Google login button and test the authentication

### 4. Verify Everything is Working

Run the configuration checker:

```bash
python check_google_config.py
```

This will verify:
- ✅ Google Client ID is configured
- ✅ Google Auth library is installed
- ✅ Backend routes are working
- ✅ Frontend integration is complete
- ✅ CSS styling is available

## 🚨 Common Issues and Solutions

### Issue: Google login button not showing
**Solution:**
- Check browser console for JavaScript errors
- Verify Google Client ID is set correctly in .env file
- Ensure `http://localhost:5000` is added to Authorized JavaScript origins

### Issue: "Invalid Google credential" error
**Solution:**
- Verify your Google Client ID matches exactly what's in Google Cloud Console
- Check that the Client ID ends with `.apps.googleusercontent.com`
- Ensure the JWT secret is properly generated and set

### Issue: CORS errors in browser
**Solution:**
- Add your exact domain to Authorized JavaScript origins
- For local development, use `http://localhost:5000` (not `127.0.0.1`)

### Issue: Backend authentication failing
**Solution:**
- Check Flask server logs for detailed error messages
- Verify `google-auth` library is installed: `pip install google-auth`
- Ensure your .env file has both `GOOGLE_CLIENT_ID` and `JWT_SECRET`

## 📋 Quick Commands Reference

```bash
# Update your Google Client ID
python update_google_client_id.py

# Check if everything is configured correctly
python check_google_config.py

# Install requirements (if needed)
pip install -r requirements.txt

# Start your Flask server
python contact_server.py
```

## 🎯 Success Indicators

You'll know everything is working when:
1. ✅ Google login button appears on your login page
2. ✅ Clicking the button opens Google sign-in popup
3. ✅ Successful Google authentication redirects to your dashboard
4. ✅ No errors in browser console
5. ✅ Configuration checker shows all green checkmarks

## 🆘 Need Help?

If you encounter issues:
1. Run `python check_google_config.py` first
2. Check the browser console for JavaScript errors
3. Check Flask server logs for backend errors
4. Verify your Google Cloud Console configuration matches your local setup

Remember: The Google login will only work when served from an authorized origin (like `http://localhost:5000`), not when opening the HTML file directly.# Google OAuth Setup Guide for SellSync

## 🎯 Overview
This guide will help you configure your Google OAuth 2.0 Client ID for the SellSync login system.

## 📋 Prerequisites
- You have already created an OAuth 2.0 Client ID in Google Cloud Console
- You have access to your Google Cloud Console credentials

## 🔧 Configuration Steps

### 1. Get Your Google Client ID
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID
3. Copy the **Client ID** (not the Client Secret)

### 2. Configure Authorized JavaScript Origins
Add these URLs to your OAuth 2.0 Client ID configuration:

**For Local Development:**
- `http://localhost:5000`
- `http://127.0.0.1:5000`

**For Production (when you deploy):**
- `https://yourdomain.com`
- `https://www.yourdomain.com`

### 3. Configure Authorized Redirect URIs
Add these redirect URLs:

**For Local Development:**
- `http://localhost:5000/auth/google`

**For Production:**
- `https://yourdomain.com/auth/google`

### 4. Update Your .env File
Replace `YOUR_GOOGLE_CLIENT_ID_HERE` in your `.env` file with your actual Client ID:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
```

### 5. Generate a JWT Secret
Create a random string for JWT token generation:

```env
JWT_SECRET=your_random_secret_string_here_make_it_long_and_complex
```

## 🧪 Testing Your Configuration

### 1. Start Your Flask Server
```bash
python contact_server.py
```

### 2. Check Configuration
Run the configuration checker:
```bash
python check_google_config.py
```

### 3. Test Google Login
1. Open your login page: `http://localhost:5000/login.html`
2. You should see the "Sign in with Google" button
3. Click it and test the authentication flow

## 🔍 Troubleshooting

### Common Issues:

**1. Google Sign-In button not showing**
- Check browser console for JavaScript errors
- Verify Google Client ID is set correctly in `.env`
- Ensure Flask server is running

**2. "Invalid Client" error**
- Double-check your Client ID is correct
- Verify authorized JavaScript origins include your domain

**3. Redirect URI mismatch**
- Make sure redirect URIs in Google Console match your setup
- Check both local and production URLs

**4. Backend authentication fails**
- Verify `google-auth` library is installed: `pip install google-auth`
- Check Flask server logs for detailed error messages

### Quick Debug Commands:
```bash
# Check if Google Auth library is installed
python -c "from google.oauth2 import id_token; print('✅ Google Auth available')"

# Check environment variables
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('Client ID:', os.getenv('GOOGLE_CLIENT_ID', '❌ Not set'))"

# Run configuration check
python check_google_config.py
```

## 📚 Additional Resources

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [Google OAuth 2.0 Setup Guide](https://support.google.com/cloud/answer/6158849)
- [Flask Google OAuth Tutorial](https://developers.google.com/identity/sign-in/web/server-side-flow)

## ✅ Success Indicators

Your Google OAuth is properly configured when:
- [ ] Google Sign-In button appears on login page
- [ ] Clicking the button opens Google authentication popup
- [ ] Users can successfully authenticate with Google
- [ ] Backend receives and validates Google tokens
- [ ] Users are redirected to dashboard after successful login

## 🚀 Next Steps

Once Google OAuth is working:
1. Test with different Google accounts
2. Set up proper user session management
3. Configure production environment
4. Add user profile integration
5. Implement logout functionality

---

Need help? Check the configuration script or contact support.