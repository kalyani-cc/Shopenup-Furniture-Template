import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendSMS() {
  try {
    const msg = await client.messages.create({
      body: "✅ Test SMS from ShopenUp",
      from: process.env.TWILIO_PHONE_NUMBER,
      to: "+917801806153", // your verified mobile number
    });
  } catch (err) {
  }
}

sendSMS();
