# Google Apps Script Setup Instructions - UPDATED FOR YOUR CREDENTIALS

Follow these steps to set up automatic email sending for your OnlyFans application form using your Google API credentials:

**Your Google Project Details:**
- Project ID: oz-agency
- API Key: AIzaSyDuLw7jmtDJi3bnfMeuocnMupMlyHLOyaQ
- Client ID: 1063610154457-lvjms5bq366gdtjqmn38tppsvuppbuuc.apps.googleusercontent.com

## Step 1: Create Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Make sure you're logged into the same Google account associated with the oz-agency project
3. Click "New Project"
4. Delete the default code and paste this script:

```javascript
function doPost(e) {
  try {
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Email recipient (your email)
    const recipientEmail = 'ozagency.of@gmail.com';
    
    // Create subject line
    const subject = `🌟 New OnlyFans Application - ${data.formData.fullLegalName}`;
    
    // Create beautifully formatted HTML email
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px;">
        
        <div style="background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
          
          <h1 style="color: #4a5568; text-align: center; margin-bottom: 30px; font-size: 28px;">
            🌟 NEW ONLYFANS CREATOR APPLICATION
          </h1>
          
          <div style="background: linear-gradient(135deg, #667eea, #764ba2); height: 4px; border-radius: 2px; margin-bottom: 30px;"></div>

          <h2 style="color: #2d3748; border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 20px;">📝 BASIC INFORMATION</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Full Legal Name:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.fullLegalName}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Online Name:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.onlineName || 'N/A'}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Email Address:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.emailAddress}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Phone Number:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.phoneNumber}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Social Usernames:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.socialUsernames}</td></tr>
          </table>

          <h2 style="color: #2d3748; border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 20px;">👤 PERSONAL PROFILE</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0; width: 180px;">About:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.personalProfile}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Attitude:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.attitudeDescription}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Location:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.basedLocation}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Age:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.age}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Height:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.height}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Languages:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.languagesSpoken}</td></tr>
          </table>

          <h2 style="color: #2d3748; border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 20px;">🔍 PERSONAL DETAILS</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Birthday:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.birthday}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Sexual Orientation:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.sexualOrientation}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Ethnicity:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.ethnicity}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Shoe Size:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.shoeSize}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Bra Size:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.braSize || 'N/A'}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Zodiac Sign:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.zodiacSign}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Where From:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.whereFrom}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Favorite Color:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.favoriteColor}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">College:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.college || 'N/A'}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Kids:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.kids || 'N/A'}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Pets:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.pets || 'N/A'}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Sports:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.sports}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Places Visited:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.placesVisited}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Relationship Status:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.relationshipStatus}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Other Work:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.otherWork}</td></tr>
          </table>

          <h2 style="color: #2d3748; border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 20px;">🎬 CONTENT & SERVICES</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Content Types:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.contentTypes}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Video Calls:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.acceptVideoCalls}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Sexiest Body Part:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.sexiestBodyPart}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Physical Appearance:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.physicalAppearance}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Custom Requests:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.customRequests}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Go Live:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.goLive}</td></tr>
          </table>

          <h2 style="color: #2d3748; border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 20px;">✅ FINAL DETAILS</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Featured People:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.featuredPeople}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">OnlyFans Credentials:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.onlyFansCredentials}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Additional Info:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.additionalInfo}</td></tr>
            <tr><td style="padding: 12px; font-weight: bold; background: #f7fafc; border: 1px solid #e2e8f0;">Commitment Understood:</td><td style="padding: 12px; border: 1px solid #e2e8f0;">${data.formData.commitmentUnderstood ? 'Yes' : 'No'}</td></tr>
          </table>

          <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 10px; color: white; text-align: center; margin-top: 30px;">
            <h3 style="margin: 0; font-size: 18px;">📅 Application Submitted</h3>
            <p style="margin: 10px 0 0 0; font-size: 16px;">${new Date().toLocaleString()}</p>
          </div>
          
        </div>
      </div>
    `;
    
    // Send the email using Gmail API
    GmailApp.sendEmail(
      recipientEmail,
      subject,
      '', // Plain text body (empty since we're using HTML)
      {
        htmlBody: htmlBody,
        replyTo: data.formData.emailAddress,
        name: 'OnlyFans Application System - Oz Agency'
      }
    );
    
    // Log success
    console.log('Email sent successfully to:', recipientEmail);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success', 
        message: 'Application email sent successfully',
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error processing application:', error);
    
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error', 
        message: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Step 2: Deploy the Script

1. Click "Deploy" > "New deployment"
2. Choose "Web app" as the type
3. Set these settings:
   - Description: "OnlyFans Application Form Handler"
   - Execute as: "Me"
   - Who has access: "Anyone"
4. Click "Deploy"
5. **COPY THE WEB APP URL** - it will look like:
   `https://script.google.com/macros/s/ABCD1234.../exec`

## Step 3: Update Your Form

1. Go back to your About.tsx file
2. Find line 127 where it says:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
   ```
3. Replace `YOUR_SCRIPT_ID` with your actual script URL from Step 2

## Step 4: Test the Form

1. Go to your onboarding form
2. Fill it out and submit
3. Check your email at ozagency.of@gmail.com
4. You should receive a beautifully formatted email with all the form data!

## Important Notes:

- The script runs under your Google account, so emails will be sent from your Gmail
- Make sure you're logged into the correct Google account when creating the script
- The script will automatically handle all form fields and format them nicely
- Each submission will create a new email with all the applicant's information

## Troubleshooting:

- If emails aren't being sent, check the Apps Script execution log
- Make sure the web app deployment is set to "Anyone" for access
- Verify the URL in your form matches the deployed web app URL exactly