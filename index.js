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
const UNA_HORA = 1 * 60 * 60 * 1000;

// 🔥 Bot listo
client.once('clientReady', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // ===== COMANDO !cagada (SIN COOLDOWN) =====
  const prefijo = "!cagada";

  if (message.content.startsWith(prefijo)) {
    const texto = message.content.slice(prefijo.length).trim();
    if (!texto) return;

    try {
      await message.delete();

      const webhook = await message.channel.createWebhook({
        name: client.user.username,
        avatar: client.user.displayAvatarURL()
      });

      await webhook.send({ content: texto });
      await webhook.delete();

    } catch (error) {
      console.error("Error usando webhook:", error);
    }

    return; // 🔥 IMPORTANTE
  }

  // ===== SISTEMA POR ROL (CON COOLDOWN DE 1 HORA) =====
  if (!message.member) return;
  if (!message.member.roles.cache.has(ROL_ID)) return;

  const ahora = Date.now();
  const ultimoMensaje = cooldown.get(message.author.id);

  if (!ultimoMensaje || ahora - ultimoMensaje > UNA_HORA) {
    message.reply("CALLATE HOMOSEXUAL");
    cooldown.set(message.author.id, ahora);
  }
});

// 🔥 Verificación de token
if (!process.env.TOKEN) {
  console.log("❌ TOKEN no detectado en el entorno");
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

// 🌐 Servidor web (para Railway)
const app = express();

app.get("/", (req, res) => {
  res.send("Bot activo");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor web activo");
});