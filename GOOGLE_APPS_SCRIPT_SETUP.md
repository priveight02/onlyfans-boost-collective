# Google Apps Script Setup Instructions

Follow these steps to set up automatic email sending for your OnlyFans application form:

## Step 1: Create Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Delete the default code and paste this script:

```javascript
function doPost(e) {
  try {
    // Parse the form data
    const formData = JSON.parse(e.postData.contents);
    
    // Your email address
    const recipientEmail = 'ozagency.of@gmail.com';
    
    // Create email subject
    const subject = `New OnlyFans Application - ${formData.fullLegalName}`;
    
    // Create HTML email body
    const htmlBody = `
      <h2>🌟 NEW ONLYFANS CREATOR APPLICATION</h2>
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        
        <h3 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">📝 BASIC INFORMATION</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">Full Legal Name:</td><td style="padding: 8px;">${formData.fullLegalName}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Online Name:</td><td style="padding: 8px;">${formData.onlineName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Email Address:</td><td style="padding: 8px;">${formData.emailAddress}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Phone Number:</td><td style="padding: 8px;">${formData.phoneNumber}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Social Usernames:</td><td style="padding: 8px;">${formData.socialUsernames}</td></tr>
        </table>

        <h3 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-top: 30px;">👤 PERSONAL PROFILE</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">About:</td><td style="padding: 8px;">${formData.personalProfile}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Attitude:</td><td style="padding: 8px;">${formData.attitudeDescription}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Location:</td><td style="padding: 8px;">${formData.basedLocation}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Age:</td><td style="padding: 8px;">${formData.age}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Height:</td><td style="padding: 8px;">${formData.height}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Languages:</td><td style="padding: 8px;">${formData.languagesSpoken}</td></tr>
        </table>

        <h3 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-top: 30px;">🔍 PERSONAL DETAILS</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">Birthday:</td><td style="padding: 8px;">${formData.birthday}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Sexual Orientation:</td><td style="padding: 8px;">${formData.sexualOrientation}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Ethnicity:</td><td style="padding: 8px;">${formData.ethnicity}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Shoe Size:</td><td style="padding: 8px;">${formData.shoeSize}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Bra Size:</td><td style="padding: 8px;">${formData.braSize}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Zodiac Sign:</td><td style="padding: 8px;">${formData.zodiacSign}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Where From:</td><td style="padding: 8px;">${formData.whereFrom}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Favorite Color:</td><td style="padding: 8px;">${formData.favoriteColor}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">College:</td><td style="padding: 8px;">${formData.college}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Kids:</td><td style="padding: 8px;">${formData.kids}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Pets:</td><td style="padding: 8px;">${formData.pets}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Sports:</td><td style="padding: 8px;">${formData.sports}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Places Visited:</td><td style="padding: 8px;">${formData.placesVisited}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Relationship Status:</td><td style="padding: 8px;">${formData.relationshipStatus}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Other Work:</td><td style="padding: 8px;">${formData.otherWork}</td></tr>
        </table>

        <h3 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-top: 30px;">🎬 CONTENT & SERVICES</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">Content Types:</td><td style="padding: 8px;">${formData.contentTypes}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Video Calls:</td><td style="padding: 8px;">${formData.acceptVideoCalls}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Sexiest Body Part:</td><td style="padding: 8px;">${formData.sexiestBodyPart}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Physical Appearance:</td><td style="padding: 8px;">${formData.physicalAppearance}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Custom Requests:</td><td style="padding: 8px;">${formData.customRequests}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Go Live:</td><td style="padding: 8px;">${formData.goLive}</td></tr>
        </table>

        <h3 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-top: 30px;">✅ FINAL DETAILS</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">Featured People:</td><td style="padding: 8px;">${formData.featuredPeople}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">OnlyFans Credentials:</td><td style="padding: 8px;">${formData.onlyFansCredentials}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Additional Info:</td><td style="padding: 8px;">${formData.additionalInfo}</td></tr>
          <tr style="background-color: #f8f9fa;"><td style="padding: 8px; font-weight: bold;">Commitment Understood:</td><td style="padding: 8px;">${formData.commitmentUnderstood}</td></tr>
        </table>

        <div style="margin-top: 30px; padding: 20px; background-color: #e0f2fe; border-radius: 8px;">
          <p style="margin: 0; font-weight: bold; color: #0277bd;">📅 Submitted: ${formData.timestamp}</p>
        </div>
      </div>
    `;
    
    // Send the email
    GmailApp.sendEmail(
      recipientEmail,
      subject,
      '', // Plain text body (empty since we're using HTML)
      {
        htmlBody: htmlBody,
        replyTo: formData.emailAddress,
        name: 'OnlyFans Application System'
      }
    );
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({status: 'success', message: 'Email sent successfully'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
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