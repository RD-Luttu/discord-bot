
# Advanced Cybersecurity Discord Bot


This bot fetches:
✅ Hacker News (Latest cybersecurity stories)
✅ CVE Updates (Latest vulnerabilities)
✅ Kali Linux Updates (New packages & releases)
✅ Security Tool Updates (Metasploit, Nmap, Burp Suite, etc.)

# Install Dependencies
npm install discord.js axios cheerio node-cron dotenv mongoose

🔧 Features & Commands
Command	Description
!hackernews	Latest cybersecurity stories from Hacker News
!cve	Recent CVE vulnerabilities
!kali	Kali Linux updates (RSS feed)
!tools	Latest security tool versions (Metasploit, Nmap, etc.)
Auto-Post	Daily updates at 12 PM (configurable)


Run the bot:

node index.js


Use PM2 for 24/7 hosting:

npm install -g pm2
pm2 start index.js --name "cyberbot"
pm2 save
pm2 startup


🔗 Extend This Bot
Add Slash Commands (/hackernews, /cve)

Add More Security Tools (Wireshark, John the Ripper)

Store User Preferences (Custom update frequency)
