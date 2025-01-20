import dotenv from "dotenv";
import { Client, GatewayIntentBits, PermissionsBitField } from "discord.js";
import schedule from "node-schedule";
import fs from "fs/promises";

dotenv.config();

// Environment variables with validation
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

// Helper Functions
async function loadMeetings() {
  try {
    const data = await fs.readFile(MEETINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      // If file doesn't exist, create it with empty array
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

function formatMeetingMessage(meeting, theme = "product") {
  const themes = {
    default: {
      prefix: "📅",
      separator: "\n",
      titlePrefix: "**Title**:",
      agendaPrefix: "**Agenda**:",
      timePrefix: "**Time**:",
    },
    minimal: {
      prefix: "→",
      separator: " | ",
      titlePrefix: "",
      agendaPrefix: "",
      timePrefix: "",
    },
    product: {
      prefix: "🎯",
      separator: "\n\n",
      decorator: "━━━━━━━━━━━━━━━━━━━━━━━",
      titlePrefix: "📌 **Title**",
      agendaPrefix: "📝 **Agenda**",
      timePrefix: "⏰ **Time**",
      footer: "\n*Your presence matters. See you there!* ✨",
    },
    modern: {
      prefix: "🔷",
      separator: "\n\n",
      decorator: "──────────────────────",
      titlePrefix: "💫 **Title**",
      agendaPrefix: "📋 **Agenda**",
      timePrefix: "🕒 **Time**",
      footer: "\n\n*Join us for an insightful discussion* 🚀",
    },
    elegant: {
      prefix: "✧",
      separator: "\n\n",
      decorator: "•═══════════════════•",
      titlePrefix: "✦ **Title**",
      agendaPrefix: "✧ **Agenda**",
      timePrefix: "✦ **Time**",
      footer: "\n\n*Looking forward to your valuable contribution* ⭐",
    },
  };

  const style = themes[theme] || themes.product;

  return (
    `${style.decorator ? style.decorator + "\n\n" : ""}` +
    `${style.prefix} **Meeting Details**${style.separator}` +
    `${style.titlePrefix}: ${meeting.title}${style.separator}` +
    `${style.agendaPrefix}: ${meeting.agenda}${style.separator}` +
    `${style.timePrefix}: ${meeting.time}` +
    `${style.footer || ""}` +
    `${style.decorator ? "\n\n" + style.decorator : ""}`
  );
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
  };

  // Match patterns like title:"value" or title: "value"
  const patterns = {
    title: /title:\s*"([^"]*)"/i,
    agenda: /agenda:\s*"([^"]*)"/i,
    time: /time:\s*"([^"]*)"/i,
    channelName: /channelName:\s*"([^"]*)"/i,
  };

  // Extract values for each field
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
  if (message.channel.id !== COMMAND_CHANNEL_ID || message.author.bot) return;

  console.log("=== COMMAND RECEIVED ===");
  console.log("Content:", message.content);
  console.log("Author:", message.author.tag);
  console.log("Channel:", message.channel.name);

  const [command, ...args] = message.content.trim().split(/\s+/);

  switch (command.toLowerCase()) {
    case "/add": {
      console.log("=== PROCESSING ADD COMMAND ===");

      // Parse the quoted arguments
      const args = parseQuotedArgs(message.content);
      console.log("Parsed arguments:", args);

      // Validate all required fields are present
      if (!args.title || !args.agenda || !args.time || !args.channelName) {
        console.log("Missing required fields");
        return message.reply(
          'Usage: `/add title:"Meeting Title" agenda:"Meeting Agenda" time:"15:00" channelName:"general"`'
        );
      }

      const { title, agenda, time, channelName } = args;

      console.log("Command parameters:", { title, agenda, time, channelName });
      console.log(
        "Target channel:",
        NOTIFICATION_CHANNELS[channelName.toLowerCase()]
      );

      if (!NOTIFICATION_CHANNELS[channelName.toLowerCase()]) {
        console.log("Invalid channel name provided");
        return message.reply(
          `❌ Invalid channel name. Available channels: ${Object.keys(
            NOTIFICATION_CHANNELS
          ).join(", ")}`
        );
      }

      try {
        console.log("1. Loading existing meetings...");
        const meetings = await loadMeetings();

        const newMeeting = {
          id: meetings.length + 1,
          title,
          agenda,
          time,
          channelName,
          channelId: NOTIFICATION_CHANNELS[channelName],
          createdAt: new Date().toISOString(),
        };

        console.log("2. New meeting object:", newMeeting);

        console.log("3. Saving meeting...");
        meetings.push(newMeeting);
        await saveMeetings(meetings);
        console.log("4. Meeting saved successfully");

        console.log("5. Sending confirmation...");
        await message.reply(`✅ Meeting added for ${channelName} channel`);

        console.log("6. Preparing notification...");
        const notificationMsg = formatMeetingMessage(newMeeting, THEME);
        console.log("7. Notification message:", notificationMsg);

        console.log("8. Sending notification...");
        const notificationSent = await sendNotification(
          NOTIFICATION_CHANNELS[channelName],
          notificationMsg
        );

        if (!notificationSent) {
          console.log("9. Notification failed, sending warning...");
          await message.reply(
            `⚠️ Warning: Meeting was saved but notification couldn't be sent to ${channelName} channel. Please check bot permissions.`
          );
        } else {
          console.log("9. Notification sent successfully");
        }

        console.log("=== ADD COMMAND COMPLETE ===");
      } catch (error) {
        console.error("=== ERROR IN ADD COMMAND ===");
        console.error("Error details:", error);
        console.error("Stack trace:", error.stack);
        await message.reply(
          "❌ An error occurred while processing your command. Please try again."
        );
      }
      break;
    }
    case "/delete": {
      if (args.length !== 1) {
        return message.reply("Usage: `/delete {id}`");
      }
      const idToDelete = parseInt(args[0], 10);
      const meetings = await loadMeetings();
      const meetingToDelete = meetings.find((m) => m.id === idToDelete);

      if (!meetingToDelete) {
        return message.reply(`❌ No meeting found with ID: ${idToDelete}`);
      }

      const updatedMeetings = meetings.filter((m) => m.id !== idToDelete);
      await saveMeetings(updatedMeetings);

      // Notify both command and target channels
      await message.reply(`✅ Meeting with ID ${idToDelete} deleted.`);
      await sendNotification(
        meetingToDelete.channelId,
        `🗑️ A meeting has been cancelled:\n${formatMeetingMessage(
          meetingToDelete,
          THEME
        )}`
      );
      break;
    }

    case "/update": {
      if (args.length < 5) {
        return message.reply(
          "Usage: `/update {id} {title} {agenda} {time} {channel-name}`"
        );
      }
      const idToUpdate = parseInt(args[0], 10);
      const updatedTitle = args[1];
      const updatedAgenda = args[2];
      const updatedTime = args[3];
      const updatedChannelName = args[4].toLowerCase();

      if (!NOTIFICATION_CHANNELS[updatedChannelName]) {
        return message.reply(
          `❌ Invalid channel name. Available channels: ${Object.keys(
            NOTIFICATION_CHANNELS
          ).join(", ")}`
        );
      }

      const meetings = await loadMeetings();
      const meetingIndex = meetings.findIndex((m) => m.id === idToUpdate);

      if (meetingIndex === -1) {
        return message.reply(`❌ No meeting found with ID: ${idToUpdate}`);
      }

      const oldMeeting = meetings[meetingIndex];
      const updatedMeeting = {
        ...oldMeeting,
        title: updatedTitle,
        agenda: updatedAgenda,
        time: updatedTime,
        channelName: updatedChannelName,
        channelId: NOTIFICATION_CHANNELS[updatedChannelName],
        updatedAt: new Date().toISOString(),
      };

      meetings[meetingIndex] = updatedMeeting;
      await saveMeetings(meetings);

      // Notify both old and new channels if channel changed
      await message.reply(`✅ Meeting with ID ${idToUpdate} updated.`);

      if (oldMeeting.channelId !== updatedMeeting.channelId) {
        await sendNotification(
          oldMeeting.channelId,
          `📝 Meeting has been moved to #${updatedChannelName}`
        );
      }

      await sendNotification(
        updatedMeeting.channelId,
        `📝 Meeting updated:\n${formatMeetingMessage(updatedMeeting, THEME)}`
      );
      break;
    }

    case "/list": {
      const meetings = await loadMeetings();
      if (meetings.length === 0) {
        return message.reply("No meetings scheduled.");
      }

      let reply = "**📅 Scheduled Meetings**\n\n";
      meetings.forEach((meeting) => {
        reply +=
          `**ID**: ${meeting.id}\n` +
          `**Title**: ${meeting.title}\n` +
          `**Agenda**: ${meeting.agenda}\n` +
          `**Time**: ${meeting.time}\n` +
          `**Channel**: ${meeting.channelName}\n\n`;
      });

      await message.reply(reply);
      break;
    }

    default:
      return message.reply(
        "Available commands:\n" +
          "`/add {title} {agenda} {time} {channel-name}`\n" +
          "`/delete {id}`\n" +
          "`/update {id} {title} {agenda} {time} {channel-name}`\n" +
          "`/list`"
      );
  }
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

