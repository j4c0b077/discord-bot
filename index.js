const { Client, GatewayIntentBits } = require('discord.js');
const express = require("express");

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
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (message.author.bot) return;
  if (!message.member) return;
  if (!message.member.roles.cache.has(ROL_ID)) return;

  const ahora = Date.now();
  const ultimoMensaje = cooldown.get(message.author.id);

  if (!ultimoMensaje || ahora - ultimoMensaje > DOS_HORAS) {
    message.reply("CALLA HOMOSEXUAL");
    cooldown.set(message.author.id, ahora);
  }
});

// 🔥 Diagnóstico del TOKEN
if (!process.env.TOKEN) {
  console.log("❌ TOKEN no detectado en Render");
} else {
  console.log("✅ TOKEN detectado");
}

console.log("🔄 Intentando iniciar sesión...");

client.login(process.env.TOKEN)
  .then(() => {
    console.log("✅ Login exitoso");
  })
  .catch(err => {
    console.error("❌ ERROR AL HACER LOGIN:");
    console.error(err);
  });

// 🌐 Servidor web para Render
const app = express();

app.get("/", (req, res) => {
  res.send("Bot activo");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor web activo");
});