# **Promptly**

**Promptly** is a powerful and user-friendly notification bot designed for teams and communities on Discord. It simplifies event reminders and announcements with customizable themes, secure configuration, and seamless deployment. **Promptly** is the ideal solution for managing notifications effectively while maintaining an elegant and professional experience for your users.

---

## **Key Features**

- **Effortless Notifications**: Easily manage meeting reminders and announcements.  
- **Customizable Themes**: Personalize the appearance of notifications to match your style.  
- **Seamless Deployment**: Deploy and run the bot in minutes with a simple setup process.  
- **Secure Configuration**: Keep sensitive credentials safe with an easy-to-manage `.env` file.  
- **Reliable and Robust**: Built with logging and monitoring to ensure consistent performance.  

---

## **Getting Started**

Follow these steps to deploy and run **Promptly** in your environment:

### **Step 1: Clone the Repository**

Clone the **Promptly** repository to your local machine:

```bash
git clone https://github.com/manishdashsharma/Promptly.git
cd promptly
```

### **Step 2: Create a Configuration File**

Create a `.env` file in the project root directory to configure the bot:

```bash
touch .env
```

Populate the `.env` file with the following variables:

```env
BOT_NAME="Promptly"
BOT_TOKEN="your-discord-bot-token"
BOT_CHANNEL_ID="bot-command-channel-id"
NOTIFICATION_CHANNELS={"example-channel-name":"channel-id"}
THEME="default"
```

### **Step 3: Start the Bot**

Run the bot using Docker Compose:

```bash
docker-compose up -d --build
```

The bot will now start running in the background, ready to send notifications.

---

## **Message Themes**

**Promptly** allows you to customize the appearance of messages using themes. Themes are defined in JSON files located in the `themes` directory. To select a theme, simply set the `THEME` variable in your `.env` file to the desired theme name.

### Example Themes

1. **Default Theme** (`themes/default.json`):  
   A clean, professional theme for general notifications.  

   ```json
   {
     "color": "#0099ff",
     "title": "New Meeting Notification",
     "footer": "Powered by Promptly",
     "fields": {
       "agenda": "Agenda",
       "time": "Time"
     }
   }
   ```

2. **Alternative Theme** (`themes/alternative.json`):  
   A vibrant, attention-grabbing theme.  

   ```json
   {
     "color": "#ff4500",
     "title": "Reminder: Upcoming Meeting",
     "footer": "Meeting Bot Reminder",
     "fields": {
       "agenda": "Topics to discuss",
       "time": "Scheduled Time"
     }
   }
   ```

To create your own theme, add a JSON file to the `themes` directory and reference it in the `.env` file.

---

## **Advanced Configuration**

### Logging and Monitoring  
**Promptly** includes built-in logging to monitor bot activity and health. Log files are generated automatically for debugging and tracking purposes.

### Security  
Sensitive data such as bot tokens are securely managed through the `.env` file. Ensure that this file is not shared or exposed to unauthorized users.

---

## **Support and Updates**

### Updates  
To update **Promptly** to the latest version, pull the latest changes from the repository and rebuild the Docker container:

```bash
git pull
docker-compose up -d --build
```

### Support  
If you encounter any issues or have questions, please contact our support team or raise an issue [Issue](https://github.com/manishdashsharma/Promptly/issues).

---

## **Why Choose Promptly?**

- **Ease of Use**: Deploy and manage notifications effortlessly.  
- **Customization**: Tailor notifications to your unique needs.  
- **Scalability**: Ready to grow with your team or community.  
- **Reliability**: Engineered for consistent performance.  

Make team communication smooth and professional with **Promptly**. Start using it today!
