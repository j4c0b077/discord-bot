const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const ROL_ID = "784521679731687474";
const cooldown = new Map();
const DOS_HORAS = 2 * 60 * 60 * 1000;

client.on('ready', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (message.author.bot) return;

  if (!message.member.roles.cache.has(ROL_ID)) return;

  const ahora = Date.now();
  const ultimoMensaje = cooldown.get(message.author.id);

  if (!ultimoMensaje || ahora - ultimoMensaje > DOS_HORAS) {
    message.reply("CALLA HOMOSEXUAL");
    cooldown.set(message.author.id, ahora);
  }
});

client.login(process.env.TOKEN);