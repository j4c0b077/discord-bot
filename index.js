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

// 🔥 Bot listo
client.once('clientReady', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // ===== COMANDO !decir =====
  if (message.content.startsWith("!cagada")) {
    const texto = message.content.slice(7).trim();
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

    return;
  }

  // ===== SISTEMA POR ROL (SIN COOLDOWN) =====
  if (!message.member) return;
  if (!message.member.roles.cache.has(ROL_ID)) return;

  message.reply("CALLA HOMOSEXUAL");
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