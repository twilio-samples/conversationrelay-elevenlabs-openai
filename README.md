
# Voice Assistant with Twilio's ConversationRelay, ElevenLabs and OpenAI (Node.js)

This application demonstrates how to use Twilio's [ConversationRelay](https://www.twilio.com/docs/voice/conversationrelay) with [ElevenLabs Voices](https://elevenlabs.io/) and [OpenAI](https://platform.openai.com/docs/api-reference/chat).

The application uses ConversationRelay to handle speech-to-text conversion, sends the transcribed text to OpenAI for responses, and uses ElevenLabs for high-quality text-to-speech synthesis.

> [!NOTE]
> This application supports both streaming and non-streaming modes for OpenAI responses, and optionally integrates with Twilio's Conversational Intelligence for call analytics.

## Prerequisites

To use the app, you will need:

- **Node.js 18+**. Download from [here](https://nodejs.org/).
- **A Twilio account**. You can sign up [here](https://www.twilio.com/try-twilio).
- **A Twilio number**. [Here's](https://help.twilio.com/articles/223135247-How-to-Search-for-and-Buy-a-Twilio-Phone-Number-from-Console) how to purchase a phone number.
- **An OpenAI API Key**. You can sign up [here](https://platform.openai.com/).
- **ngrok CLI**. You can install [here](https://ngrok.com/).

### Environment variables

This project requires some environment variables to be set. A file named `.env` is used to store the values for those environment variables. To keep your tokens and secrets secure, make sure to not commit the `.env` file in git.

An example of this file with the environment variables for this project is in `env.example`; you can rename this file to `.env` and add in your environment variables for this project.

In your `.env` file, set the following values:

| Variable | Description | Required |
| :------- | :---------- | :------- |
| `PORT` | Your server port where your application will be hosted. Default is `8080` | No |
| `NGROK_DOMAIN` | Your ngrok domain (without https://) | Yes |
| `OPENAI_API_KEY` | Your OpenAI API key. | Yes |
| `OPENAI_MODEL` | OpenAI model to use. Default is `gpt-4o-mini`. | No |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID for text-to-speech. Default is `ZF6FPAbjXT4488VcRRnw` (Amelia) | No |
| `ELEVENLABS_MODEL` | ElevenLabs model. Default is `flash_v2_5`. | No |
| `ELEVENLABS_SPEED` | Speech speed. Default is `1.0`. | No |
| `ELEVENLABS_STABILITY` | Voice stability. Default is `1.0`. | No |
| `ELEVENLABS_SIMILARITY` | Voice similarity. Default is `1.0`. | No |
| `ELEVENLABS_TEXT_NORMALIZATION` | Text normalization setting. Default is `true`. | No |
| `USE_STREAMING` | Enable streaming responses from OpenAI. Default is `true`. | No |
| `CONVERSATIONAL_INTELLIGENCE_SID` | Twilio Conversational Intelligence Service SID for call analytics. | No |

For more information on ElevenLabs voice customization, check out our docs here: *[How to use ElevenLabs voices](https://www.twilio.com/docs/voice/conversationrelay/voice-configuration#how-to-use-elevenlabs-voices)*

## Local Setup

There are 4 required steps to get the app up-and-running locally for development and testing:
1. Run ngrok.
2. Update the .env file
3. Install the packages
4. Twilio setup

### 1. Open an ngrok tunnel
When developing & testing locally, you'll need to open a tunnel to forward requests to your local development server.

Open a Terminal and run:

```bash
ngrok http 8080
```
Copy the domain portion from **Forwarding URL** (e.g. `abc123.ngrok.app`, without https://) and replace it with the `DOMAIN` value in the .env file

### 2. Update the .env file

Rename `env.example` to `.env`. Edit the `.env` file and update the required values:
- `DOMAIN` - Your ngrok Forwarding URL domain (without https://). 
- `OPENAI_API_KEY` - Your OpenAI API key

### 3. Install packages

```bash
npm install
```

### 4. Twilio setup

1. Go to your [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** > **Manage** > **Active Numbers**
3. Click on your phone number
4. Under the **Configure** tab, head to **Voice Configuration**. Set **A call comes in** webhook to your ngrok Forwarding URL with `/twiml` appended to it: `https://your-ngrok-domain.ngrok.app/twiml`
5. Click **Save configuration**

## Run the app

Start the development server:

```bash
node index.js
```

You should see output similar to:
```
Server running at http://localhost:8080
WebSocket endpoint: wss://your-domain.ngrok.app/ws
TwiML endpoint: https://your-domain.ngrok.app/twiml
Voice: your-voice-configuration
AI Model: gpt-4o-mini
Streaming: Enabled
```

### Test the app

Call your Twilio phone number. You should hear the welcome greeting and be able to have a conversation with your AI assistant.

## Additional Resources

Want to learn more about building this application? Check out these helpful tutorials:
- *[Integrate ElevenLabs Voices with Twilio's ConversationRelay](https://www.twilio.com/en-us/blog/integrate-elevenlabs-voices-with-twilios-conversationrelay)*
- *[Set Up a Native Integration with Conversational Intelligence and ConversationRelay using Node.js](https://www.twilio.com/en-us/blog/native-integration-conversational-intelligence-conversationrelay-node)*
 -*[Integrate OpenAI with Twilio Voice Using ConversationRelay](https://www.twilio.com/en-us/blog/developers/tutorials/product/integrate-openai-twilio-voice-using-conversationrelay)*
