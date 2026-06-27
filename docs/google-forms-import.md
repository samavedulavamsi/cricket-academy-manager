# Google Forms Player Import

Yes, you can collect player registrations in Google Forms and store them in this app.

## Recommended Flow

Google Form -> Google Sheet -> Apps Script -> `POST /api/import/google-forms/player` -> Coach gives Player Code -> Player creates their own account

This app now includes the backend endpoint:

```text
POST http://YOUR_BACKEND_URL/api/import/google-forms/player
```

It requires this header:

```text
x-import-token: your-token-from-GOOGLE_FORMS_IMPORT_TOKEN
```

## Form Questions

Create a Google Form with these question titles:

- Academy Code
- Full Name
- Date of Birth
- Gender
- Mobile Number
- Parent Name
- Parent Contact Number
- Address
- Blood Group
- Emergency Contact
- Playing Role
- Batting Style
- Bowling Style
- Jersey Number
- Joining Date
- Skill Level
- Monthly Fee Amount
- Admission Fee
- Discount
Portal email/password are optional. The recommended flow is to leave these blank and let the player create their own password from the `Create` tab in the app.

Use these exact option values where possible:

- Gender: `MALE`, `FEMALE`, `OTHER`
- Playing Role: `BATSMAN`, `BOWLER`, `ALL_ROUNDER`, `WICKET_KEEPER`
- Skill Level: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`

## Apps Script

Open the response Google Sheet, then go to `Extensions -> Apps Script` and paste:

```javascript
const API_URL = "http://YOUR_BACKEND_URL/api/import/google-forms/player";
const IMPORT_TOKEN = "replace-with-your-GOOGLE_FORMS_IMPORT_TOKEN";

function onFormSubmit(e) {
  const row = e.namedValues;

  const payload = {
    academyCode: value(row, "Academy Code"),
    fullName: value(row, "Full Name"),
    dateOfBirth: value(row, "Date of Birth"),
    gender: value(row, "Gender") || "MALE",
    mobileNumber: value(row, "Mobile Number"),
    parentName: value(row, "Parent Name"),
    parentContactNumber: value(row, "Parent Contact Number"),
    address: value(row, "Address"),
    bloodGroup: value(row, "Blood Group"),
    emergencyContact: value(row, "Emergency Contact"),
    playingRole: value(row, "Playing Role") || "BATSMAN",
    battingStyle: value(row, "Batting Style") || "Right Hand Bat",
    bowlingStyle: value(row, "Bowling Style") || "None",
    jerseyNumber: value(row, "Jersey Number"),
    joiningDate: value(row, "Joining Date") || new Date().toISOString(),
    skillLevel: value(row, "Skill Level") || "BEGINNER",
    monthlyFeeAmount: value(row, "Monthly Fee Amount") || 0,
    admissionFee: value(row, "Admission Fee") || 0,
    discount: value(row, "Discount") || 0
  };

  UrlFetchApp.fetch(API_URL, {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-import-token": IMPORT_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function value(row, key) {
  return row[key] && row[key][0] ? row[key][0] : "";
}
```

Then add an installable trigger:

1. In Apps Script, open `Triggers`.
2. Add trigger.
3. Choose function: `onFormSubmit`.
4. Event source: `From spreadsheet`.
5. Event type: `On form submit`.

## Local Development Note

Google Apps Script cannot call `localhost`. For local testing, expose your backend with a tunnel such as ngrok or Cloudflare Tunnel, then set `API_URL` to that public HTTPS URL.

## Player Self Registration

After the Google Form import creates the player record:

1. Coach shares the generated `playerCode` with the player.
2. Player opens the app and selects `Create`.
3. Player enters:
   - Academy Code
   - Player Code
   - Parent Contact Number
   - Email
   - New Password
4. The app verifies the player code and parent contact number before creating the login.

Player data is stored securely in PostgreSQL. Reports can be downloaded as CSV, which opens in Excel.
