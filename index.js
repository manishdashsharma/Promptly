import dotenv from "dotenv";
import { Client, GatewayIntentBits, PermissionsBitField , Collection} from "discord.js";
import schedule from "node-schedule";
import fs from "fs/promises";

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const COMMAND_CHANNEL_ID = process.env.BOT_CHANNEL_ID;
let NOTIFICATION_CHANNELS = {};

try {
  NOTIFICATION_CHANNELS = process.env.NOTIFICATION_CHANNELS
    ? JSON.parse(process.env.NOTIFICATION_CHANNELS)
    : {};
  console.log("Configured notification channels:", NOTIFICATION_CHANNELS);
} catch (error) {
  console.error("Error parsing NOTIFICATION_CHANNELS:", error);
}

const BOT_NAME = process.env.BOT_NAME || "Meeting Bot";
const THEME = process.env.THEME || "default";
const MEETINGS_FILE = "meetings.json";

const conversationStates = new Collection();
const CONVERSATION_TIMEOUT = 300000;

async function loadMeetings() {
  try {
    const data = await fs.readFile(MEETINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {

      await saveMeetings([]);
      return [];
    }
    console.error("Error loading meetings:", error.message);
    return [];
  }
}

async function saveMeetings(meetings) {
  try {
    await fs.writeFile(MEETINGS_FILE, JSON.stringify(meetings, null, 2));
  } catch (error) {
    console.error("Error saving meetings:", error.message);
  }
}

const themes = {
  executive: {
    prefix: "🎯",
    separator: "\n\n",
    decorator: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    titlePrefix: "📊 **Meeting Overview**",
    agendaPrefix: "🎯 **Key Points**",
    timePrefix: "⏰ **Schedule**",
    channelPrefix: "📢 **Channel**",
    notesPrefix: "📝 **Additional Notes**",
    footer: "\n\n*Your insights are invaluable to our success. We look forward to your participation.* ✨"
  },
  corporate: {
    prefix: "⚡",
    separator: "\n\n",
    decorator: "════════════════════════════════════",
    titlePrefix: "📈 **Strategic Meeting**",
    agendaPrefix: "📋 **Agenda Items**",
    timePrefix: "🕒 **Timing**",
    channelPrefix: "📢 **Channel**",
    notesPrefix: "📌 **Key Information**",
    footer: "\n\n*Together we drive excellence. Your presence is essential.* 🎯"
  },
  modern: {
    prefix: "💫",
    separator: "\n\n",
    decorator: "──────────────────────────────",
    titlePrefix: "🔮 **Session**",
    agendaPrefix: "🎯 **Focus Areas**",
    timePrefix: "⏳ **Time**",
    channelPrefix: "📢 **Channel**",
    notesPrefix: "💡 **Notes**",
    footer: "\n\n*Be part of something extraordinary. Your perspective matters.* 🚀"
  },
  minimal: {
    prefix: "●",
    separator: "\n\n",
    decorator: "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯",
    titlePrefix: "∙ **Meeting**",
    agendaPrefix: "∙ **Agenda**",
    timePrefix: "∙ **Time**",
    channelPrefix: "∙ **Channel**",
    notesPrefix: "∙ **Notes**",
    footer: "\n\n*We value your contribution.* ○"
  },
  product: {
    prefix: "🎯",
    separator: "\n\n",
    decorator: "━━━━━━━━━━━━━━━━━━━━━━━",
    titlePrefix: "📌 **Title**",
    agendaPrefix: "📝 **Agenda**",
    timePrefix: "⏰ **Time**",
    channelPrefix: "📢 **Channel**",
    notesPrefix: "📋 **Notes**",
    footer: "\n*Your presence matters. See you there!* ✨"
  },
  holiday: {
    prefix: "🎉",
    separator: "\n\n",
    decorator: "∽∽∽∽∽∽∽∽∽∽∽∽∽∽∽∽∽∽∽∽∽∽∽∽",
    titlePrefix: "🎊 **Holiday Celebration**",
    agendaPrefix: "🎈 **Activities**",
    timePrefix: "🕰️ **Event Time**",
    channelPrefix: "📣 **Meeting Point**",
    notesPrefix: "✨ **Important Details**",
    footer: "\n\n*Let's celebrate together! Join us for some festive fun.* 🎄"
  },
  intern: {
    prefix: "🌟",
    separator: "\n\n",
    decorator: "· · · · · · · · · · · · · · · · · ·",
    titlePrefix: "📚 **Learning Session**",
    agendaPrefix: "💡 **Today's Topics**",
    timePrefix: "⌚ **Meeting Time**",
    channelPrefix: "🎓 **Meeting Room**",
    notesPrefix: "📝 **Preparation Notes**",
    footer: "\n\n*Your growth journey matters! Come ready to learn and share.* 🚀"
  }
};


// Replace the existing formatMeetingMessage function with this enhanced version
function formatMeetingMessage(meeting, theme = "corporate") {
  const style = themes[theme] || themes.executive;
  
  // Format agenda items with proper indentation and spacing
  const formattedAgenda = meeting.agenda
    .split(/(?=\d+\.|\n)/g)
    .map(item => item.trim())
    .filter(Boolean)
    .join('\n   ');

  let message = '';
  
  // Add header decorator
  if (style.decorator) {
    message += `${style.decorator}\n\n`;
  }

  // Build main content
  message += [
    `${style.prefix} ${style.titlePrefix}\n   ${meeting.title}`,
    `${style.agendaPrefix}\n   ${formattedAgenda}`,
    `${style.timePrefix}\n   ${meeting.time}`,
    `${style.channelPrefix}\n   #${meeting.channelName}`,
    `${style.notesPrefix}\n   • Please review any materials beforehand\n   • Be prepared with your questions\n   • Meeting notes will be shared in the channel`
  ].join(style.separator);

  // Add footer
  if (style.footer) {
    message += style.footer;
  }

  // Add closing decorator
  if (style.decorator) {
    message += `\n\n${style.decorator}`;
  }

  return message;
}

function createConversationState() {
  return {
    step: 'initial',
    data: {
      title: '',
      agenda: '',
      time: '',
      channelName: '',
      theme: 'corporate'
    },
    lastUpdateTime: Date.now()
  };
}

async function handleConversationStep(message, state) {
  const content = message.content.toLowerCase();
  
  switch (state.step) {
    case 'initial':
      await message.reply(
        "What would you like to do?\n" +
        "1️⃣ Add a new meeting\n" +
        "2️⃣ List meetings\n" +
        "3️⃣ Delete a meeting\n" +
        "4️⃣ Update a meeting\n\n" +
        "Just type the number or action you want!"
      );
      state.step = 'action_choice';
      break;

    case 'action_choice':
      if (['1', 'add', 'new', 'create'].includes(content)) {
        await message.reply("Please enter the meeting title:");
        state.step = 'title';
      } else if (['2', 'list', 'show'].includes(content)) {
        await handleListCommand(message);
        state.step = 'initial';
      } else if (['3', 'delete', 'remove'].includes(content)) {
        await message.reply("Please enter the meeting ID to delete:");
        state.step = 'delete';
      } else if (['4', 'update', 'edit'].includes(content)) {
        await message.reply("Please enter the meeting ID to update:");
        state.step = 'update_id';
      } else {
        await message.reply("I didn't understand that. Please choose a number between 1-4 or type the action.");
      }
      break;

    case 'title':
      state.data.title = message.content;
      await message.reply("Great! Now enter the agenda items (separate items with numbers like:\n1. First item\n2. Second item):");
      state.step = 'agenda';
      break;

    case 'agenda':
      state.data.agenda = message.content;
      await message.reply("When should the meeting take place? (Format: HH:MM, e.g., 14:30):");
      state.step = 'time';
      break;

    case 'time':
      if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(content)) {
        state.data.time = content;
        await message.reply(
          `Which channel should I post this in?\nAvailable channels: ${Object.keys(NOTIFICATION_CHANNELS).join(", ")}`
        );
        state.step = 'channel';
      } else {
        await message.reply("Please enter a valid time in HH:MM format (e.g., 14:30):");
      }
      break;

    case 'channel':
      if (NOTIFICATION_CHANNELS[content]) {
        state.data.channelName = content;
        await message.reply(
          "Choose a theme for your meeting:\n" +
          "1. executive - Formal executive meetings\n" +
          "2. corporate - Professional business meetings\n" +
          "3. modern - Contemporary casual meetings\n" +
          "4. minimal - Clean and simple style\n" +
          "5. product - Product-focused meetings\n" +
          "6. holiday - Festive celebrations\n" +
          "7. intern - Learning sessions\n" +
          "\nType the theme name or number:"
        );
        state.step = 'theme';
      } else {
        await message.reply(`Invalid channel. Please choose from: ${Object.keys(NOTIFICATION_CHANNELS).join(", ")}`);
      }
      break;

    case 'theme':
      const themeMap = {
        '1': 'executive',
        '2': 'corporate',
        '3': 'modern',
        '4': 'minimal',
        '5': 'product',
        '6': 'holiday',
        '7': 'intern'
      };

      const selectedTheme = themeMap[content] || content;
      if (themes[selectedTheme]) {
        state.data.theme = selectedTheme;
        // Create the meeting using existing add logic
        const newMeeting = {
          id: (await loadMeetings()).length + 1,
          ...state.data,
          channelId: NOTIFICATION_CHANNELS[state.data.channelName],
          createdAt: new Date().toISOString()
        };

        try {
          const meetings = await loadMeetings();
          meetings.push(newMeeting);
          await saveMeetings(meetings);
          
          const notificationMsg = formatMeetingMessage(newMeeting, state.data.theme);
          await sendNotification(NOTIFICATION_CHANNELS[state.data.channelName], notificationMsg);
          
          await message.reply("✅ Meeting has been created successfully!");
        } catch (error) {
          await message.reply("❌ There was an error creating the meeting. Please try again.");
        }
        
        // Reset conversation state
        conversationStates.delete(message.author.id);
      } else {
        await message.reply("Please choose a valid theme name or number.");
      }
      break;

    case 'delete':
      const idToDelete = parseInt(content);
      if (isNaN(idToDelete)) {
        await message.reply("Please enter a valid meeting ID number:");
        return;
      }
      
      const meetings = await loadMeetings();
      const meetingToDelete = meetings.find(m => m.id === idToDelete);
      
      if (!meetingToDelete) {
        await message.reply(`❌ No meeting found with ID: ${idToDelete}`);
      } else {
        const updatedMeetings = meetings.filter(m => m.id !== idToDelete);
        await saveMeetings(updatedMeetings);
        await message.reply(`✅ Meeting with ID ${idToDelete} has been deleted.`);
      }
      
      conversationStates.delete(message.author.id);
      break;
  }
  
  state.lastUpdateTime = Date.now();
}

// Add this function before the client initialization

async function handleListCommand(message) {
  try {
    const meetings = await loadMeetings();
    
    if (meetings.length === 0) {
      await message.reply("No meetings are currently scheduled.");
      return;
    }

    // Sort meetings by time
    meetings.sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    // Create a summary message
    let summary = "**📋 Scheduled Meetings**\n\n";
    
    meetings.forEach((meeting) => {
      summary += `**ID:** ${meeting.id}\n`;
      summary += `**Title:** ${meeting.title}\n`;
      summary += `**Time:** ${meeting.time}\n`;
      summary += `**Channel:** #${meeting.channelName}\n`;
      summary += `**Theme:** ${meeting.theme}\n`;
      summary += "───────────────\n\n";
    });

    // Split long messages if necessary (Discord has a 2000 character limit)
    if (summary.length > 1900) {
      const chunks = summary.match(/.{1,1900}/g);
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      await message.reply(summary);
    }
  } catch (error) {
    console.error("Error listing meetings:", error);
    await message.reply("❌ There was an error listing the meetings. Please try again.");
  }
}

// Initialize Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Bot ready event
client.on("ready", async () => {
  console.log(`${BOT_NAME} logged in as ${client.user.tag}!`);

  try {
    const commandChannel = await client.channels.fetch(COMMAND_CHANNEL_ID);
    console.log(`Command channel found: ${commandChannel.name}`);

    for (const [name, id] of Object.entries(NOTIFICATION_CHANNELS)) {
      try {
        const channel = await client.channels.fetch(id);
        const permissions = channel.permissionsFor(client.user);

        if (!permissions.has(PermissionsBitField.Flags.SendMessages)) {
          console.error(
            `Missing SendMessages permission in ${name} channel (${id})`
          );
        } else {
          console.log(`Successfully verified ${name} channel (${id})`);
        }
      } catch (error) {
        console.error(
          `Failed to verify channel ${name} (${id}):`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("Error during channel verification:", error);
  }
});

// Helper function to parse quoted arguments
function parseQuotedArgs(content) {
  // Remove the command part
  const commandText = content.trim().split(/\s+/)[0];
  const argsText = content.slice(commandText.length).trim();

  // Initialize result object
  const args = {
    title: "",
    agenda: "",
    time: "",
    channelName: "",
    theme: "" 
  };

  const patterns = {
    title: /title:\s*"([^"]*)"/i,
    agenda: /agenda:\s*"([^"]*)"/i,
    time: /time:\s*"([^"]*)"/i,
    channelName: /channelName:\s*"([^"]*)"/i,
    theme: /theme:\s*"([^"]*)"/i  
  };

  for (const [field, pattern] of Object.entries(patterns)) {
    const match = argsText.match(pattern);
    if (match) {
      args[field] = match[1];
    }
  }

  return args;
}

async function sendNotification(channelId, message) {
  console.log("=== NOTIFICATION ATTEMPT ===");
  console.log(`Attempting to send notification to channel ${channelId}`);
  console.log("Message content:", message);

  try {
    console.log("1. Fetching channel...");
    const channel = await client.channels.fetch(channelId);

    console.log("2. Channel found:", channel.name);
    console.log("3. Checking permissions...");

    const permissions = channel.permissionsFor(client.user);
    console.log("4. Bot permissions:", {
      sendMessages: permissions.has(PermissionsBitField.Flags.SendMessages),
      viewChannel: permissions.has(PermissionsBitField.Flags.ViewChannel),
    });

    if (!permissions.has(PermissionsBitField.Flags.SendMessages)) {
      throw new Error(
        `Missing SendMessages permission in channel ${channelId}`
      );
    }

    console.log("5. Sending message...");
    const sent = await channel.send(message);
    console.log("6. Message sent successfully!");
    console.log("=== NOTIFICATION COMPLETE ===");
    return sent;
  } catch (error) {
    console.error("=== NOTIFICATION ERROR ===");
    console.error("Error details:", error);
    console.error("Stack trace:", error.stack);
    console.error("=== END ERROR ===");
    return null;
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  
  // Check if it's a simple greeting
  const greetings = ['hi', 'hello', 'hey', 'start', 'help'];
  if (greetings.includes(message.content.toLowerCase())) {
    const state = createConversationState();
    conversationStates.set(message.author.id, state);
    await handleConversationStep(message, state);
    return;
  }

  // Get existing conversation state or return if none exists
  let state = conversationStates.get(message.author.id);
  if (!state) return;

  // Check for conversation timeout
  if (Date.now() - state.lastUpdateTime > CONVERSATION_TIMEOUT) {
    conversationStates.delete(message.author.id);
    await message.reply("The conversation timed out. Please start again with 'hey'.");
    return;
  }

  // Handle the conversation step
  await handleConversationStep(message, state);
});

// Login with error handling
client.login(TOKEN).catch((err) => {
  console.error("Failed to login:", err);
});

schedule.scheduleJob("0 8 * * *", async () => {
  const meetings = await loadMeetings();
  if (meetings.length === 0) return;

  // Group meetings by channel
  const meetingsByChannel = meetings.reduce((acc, meeting) => {
    if (!acc[meeting.channelId]) {
      acc[meeting.channelId] = [];
    }
    acc[meeting.channelId].push(meeting);
    return acc;
  }, {});

  // Send summary to each channel
  for (const [channelId, channelMeetings] of Object.entries(
    meetingsByChannel
  )) {
    let summary = `**📅 Today's Meetings in #${channelMeetings[0].channelName}**\n\n`;
    channelMeetings.forEach((meeting) => {
      summary += formatMeetingMessage(meeting, THEME) + "\n\n";
    });

    await sendNotification(channelId, summary);
  }
});