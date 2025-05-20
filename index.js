require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const mongoose = require('mongoose');

// Initialize Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// MongoDB Setup (Optional)
mongoose.connect(process.env.MONGO_URI || '', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Server Settings Schema (For Custom Channels)
const serverSchema = new mongoose.Schema({
  guildId: String,
  newsChannel: String,
  cveChannel: String,
  kaliChannel: String,
});
const ServerSettings = mongoose.model('ServerSettings', serverSchema);

// ====== BOT EVENTS ======
client.once('ready', () => {
  console.log(`🤖 ${client.user.tag} is Online!`);

  // Scheduled Tasks (Runs Daily at 12 PM)
  cron.schedule('0 12 * * *', async () => {
    await postHackerNews();
    await postCVEs();
    await postKaliUpdates();
  });
});

// ====== COMMANDS ======
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.slice(1).split(' ');
  const command = args.shift().toLowerCase();

  // !hackernews - Latest cybersecurity stories
  if (command === 'hackernews') {
    const news = await fetchHackerNews(5);
    const embed = new EmbedBuilder()
      .setTitle('🔥 Latest Hacker News')
      .setColor('#FF6600') // Orange like HN
      .setDescription('Top cybersecurity stories from Hacker News:');

    news.forEach((item, i) => {
      embed.addFields({
        name: `${i + 1}. ${item.title}`,
        value: `[Read More](${item.url}) | 👍 ${item.points} | 💬 ${item.comments}`,
      });
    });

    message.channel.send({ embeds: [embed] });
  }

  // !cve - Latest CVE vulnerabilities
  else if (command === 'cve') {
    const cves = await fetchCVEs(5);
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Recent CVEs (Critical Vulnerabilities)')
      .setColor('#FF0000')
      .setDescription('Latest cybersecurity vulnerabilities:');

    cves.forEach((cve, i) => {
      embed.addFields({
        name: `${i + 1}. ${cve.id}`,
        value: `**CVSS:** ${cve.cvss || 'N/A'}\n**Summary:** ${cve.summary?.substring(0, 100)}...\n[Details](${cve.url})`,
      });
    });

    message.channel.send({ embeds: [embed] });
  }

  // !kali - Latest Kali Linux updates
  else if (command === 'kali') {
    const updates = await fetchKaliUpdates(3);
    const embed = new EmbedBuilder()
      .setTitle('🐉 Kali Linux Updates')
      .setColor('#5575C9') // Kali Blue
      .setDescription('Recent Kali Linux package updates:');

    updates.forEach((update, i) => {
      embed.addFields({
        name: `${i + 1}. ${update.title}`,
        value: `📅 ${update.date}\n[Read More](${update.url})`,
      });
    });

    message.channel.send({ embeds: [embed] });
  }

  // !tools - Latest security tool updates
  else if (command === 'tools') {
    const updates = await fetchSecurityToolUpdates();
    const embed = new EmbedBuilder()
      .setTitle('🛠️ Security Tool Updates')
      .setColor('#00FF00')
      .setDescription('Latest versions of popular security tools:');

    updates.forEach((tool) => {
      embed.addFields({
        name: tool.name,
        value: `**Version:** ${tool.version}\n**Release Date:** ${tool.date || 'N/A'}\n[Website](${tool.url})`,
      });
    });

    message.channel.send({ embeds: [embed] });
  }
});

// ====== API FUNCTIONS ======
// Fetch Hacker News (Cybersecurity Stories)
async function fetchHackerNews(limit = 5) {
  try {
    const res = await axios.get(process.env.HN_API);
    return res.data.hits.slice(0, limit).map(item => ({
      title: item.title,
      url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`,
      points: item.points,
      comments: item.num_comments,
    }));
  } catch (err) {
    console.error('❌ Hacker News Error:', err);
    return [];
  }
}

// Fetch Latest CVEs
async function fetchCVEs(limit = 5) {
  try {
    const res = await axios.get(process.env.CVE_API);
    return res.data.slice(0, limit).map(cve => ({
      id: cve.id,
      summary: cve.summary,
      cvss: cve.cvss,
      url: `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${cve.id}`,
    }));
  } catch (err) {
    console.error('❌ CVE Fetch Error:', err);
    return [];
  }
}

// Fetch Kali Linux Updates (RSS Feed)
async function fetchKaliUpdates(limit = 3) {
  try {
    const res = await axios.get(process.env.KALI_RSS);
    const $ = cheerio.load(res.data, { xmlMode: true });
    const updates = [];
    
    $('item').slice(0, limit).each((i, el) => {
      updates.push({
        title: $(el).find('title').text(),
        url: $(el).find('link').text(),
        date: $(el).find('pubDate').text(),
      });
    });

    return updates;
  } catch (err) {
    console.error('❌ Kali RSS Error:', err);
    return [];
  }
}

// Fetch Security Tool Updates (Static Data for Example)
async function fetchSecurityToolUpdates() {
  return [
    {
      name: 'Metasploit',
      version: '6.3.0',
      date: '2024-01-15',
      url: 'https://www.metasploit.com/',
    },
    {
      name: 'Nmap',
      version: '7.94',
      date: '2023-12-20',
      url: 'https://nmap.org/',
    },
    {
      name: 'Burp Suite',
      version: '2023.12.1',
      date: '2023-12-05',
      url: 'https://portswigger.net/burp',
    },
  ];
}

// ====== AUTO-POSTING FUNCTIONS ======
async function postHackerNews() {
  const guilds = client.guilds.cache;
  const news = await fetchHackerNews(3);

  guilds.forEach(async (guild) => {
    const settings = await ServerSettings.findOne({ guildId: guild.id });
    if (!settings?.newsChannel) return;

    const channel = guild.channels.cache.get(settings.newsChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('📰 Daily Hacker News')
      .setColor('#FF6600')
      .setDescription('Latest cybersecurity stories:');

    news.forEach((item, i) => {
      embed.addFields({
        name: `${i + 1}. ${item.title}`,
        value: `[Read More](${item.url}) | 👍 ${item.points}`,
      });
    });

    channel.send({ embeds: [embed] });
  });
}

// Similar functions for postCVEs(), postKaliUpdates()...

// ====== START THE BOT ======
client.login(process.env.TOKEN);