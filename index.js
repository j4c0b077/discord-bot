const { Client, GatewayIntentBits } = require('discord.js');
const express = require("express");
const axios = require("axios");

const RAWG_KEY = process.env.RAWG_KEY;

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

// =========================
// 🟢 DETECTOR DE ACTUALIZACIONES
// =========================

const FORTNITE_CHANNEL_ID = "1298008832471208008";
const FORTNITE_ROLE_ID = "964381722173116446";

let lastNewsHash = null;

async function checkFortniteNews() {

  try {

    const response = await axios.get("https://fortnite-api.com/v2/news");
    const data = response.data.data.br;

    const newHash = data.hash;

    if (!lastNewsHash) {
      lastNewsHash = newHash;
      return;
    }

    if (newHash !== lastNewsHash) {

      const channel = client.channels.cache.get(FORTNITE_CHANNEL_ID);
      if (!channel) return;

      const noticia = data.motds[0];

      await channel.send({
        content: `<@&${FORTNITE_ROLE_ID}> 🚨 **Nueva actualización de Fortnite**`,
        embeds: [{
          color: 0x2ECC71,
          title: noticia.title,
          description: noticia.body,
          image: { url: noticia.image },
          footer: { text: "Actualización detectada automáticamente" }
        }]
      });

      lastNewsHash = newHash;

    }

  } catch (error) {
    console.log("Error revisando Fortnite:", error.message);
  }

}

// 🔥 BOT LISTO

client.once('clientReady', () => {

  console.log(`✅ Bot conectado como ${client.user.tag}`);

  setInterval(checkFortniteNews, 600000);

});

client.on('messageCreate', async message => {

  if (message.author.bot) return;

  // =========================
  // 🎮 COMANDO !game
  // =========================

  if (message.content.startsWith("!game")) {

    const gameName = message.content.slice(5).trim();
    if (!gameName) return message.reply("Escribe el nombre del juego.");

    try {

      const response = await axios.get(
        `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(gameName)}`
      );

      if (!response.data.results.length) {
        return message.reply("No encontré ese juego.");
      }

      const game = response.data.results[0];

      const plataformas = game.platforms?.map(p => p.platform.name).join(", ") || "No disponible";
      const generos = game.genres?.map(g => g.name).join(", ") || "No disponible";

      await message.channel.send({
        embeds: [{
          color: 0x8A2BE2,
          author: {
            name: message.author.username,
            icon_url: message.author.displayAvatarURL()
          },
          title: `🎮 ${game.name}`,
          image: { url: game.background_image },
          description:
            "━━━━━━━━━━━━━━━━━━\n" +
            `**Plataformas:** ${plataformas}\n\n` +
            `**Rating:** ⭐ ${game.rating}/5\n\n` +
            `**Lanzamiento:** 📅 ${game.released}\n\n` +
            `**Géneros:** 🎯 ${generos}\n` +
            "━━━━━━━━━━━━━━━━━━",
          footer: { text: "Información obtenida de RAWG" }
        }]
      });

    } catch (error) {

      console.error(error);
      message.reply("Hubo un error buscando el juego.");

    }

    return;
  }

  // =========================
  // 🧪 COMANDO !test (TEST NOTICIA SIN PING)
  // =========================

  if (message.content === "!test") {

    try {

      const response = await axios.get("https://fortnite-api.com/v2/news");
      const data = response.data.data.br;

      const noticia = data.motds[0];

      await message.channel.send({

        content: "🚨 **Nueva actualización de Fortnite (TEST)**",

        embeds: [{
          color: 0x2ECC71,
          title: noticia.title,
          description: noticia.body,
          image: { url: noticia.image },
          footer: { text: "Mensaje de prueba del bot" }
        }]

      });

    } catch (error) {

      message.reply("No pude obtener la noticia.");

    }

    return;
  }

  // =========================
  // 🌐 COMANDO !servidores
  // =========================

  if (message.content === "!servidores") {

    try {

      const res = await axios.get("https://status.epicgames.com/api/v2/status.json");
      const estado = res.data.status.indicator;

      if (estado === "none") {
        message.channel.send("🟢 online");
      }
      else if (estado === "minor" || estado === "major") {
        message.channel.send("🟡 mantenimiento");
      }
      else {
        message.channel.send("🔴 caídos");
      }

    } catch {

      message.channel.send("⚠️ No pude comprobar los servidores.");

    }

    return;
  }

  // =========================
  // ❓ COMANDO !ayuda
  // =========================

  if (message.content === "!ayuda") {

    await message.channel.send({
      embeds: [{
        color: 0xE74C3C,
        author: {
          name: message.author.username,
          icon_url: message.author.displayAvatarURL()
        },
        title: "📖 Centro de Comandos",
        description:
          "━━━━━━━━━━━━━━━━━━\n\n" +

          "🎮 **Juegos**\n" +
          "`!game nombre`\n" +
          "Información de videojuegos.\n\n" +

          "`!servidores`\n" +
          "Estado de servidores de Fortnite.\n\n" +

          "⚙️ **Utilidades**\n" +
          "`!cagada mensaje`\n" +
          "Enviar mensaje como el bot.\n\n" +

          "❓ **Información**\n" +
          "`!ayuda`\n" +
          "Lista de comandos.\n\n" +

          "━━━━━━━━━━━━━━━━━━",

        footer: { text: "Sistema de ayuda del bot" }
      }]
    });

    return;
  }

  // =========================
  // 💬 COMANDO !cagada
  // =========================

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

    return;
  }

  // =========================
  // 🔒 SISTEMA POR ROL
  // =========================

  if (!message.member) return;
  if (!message.member.roles.cache.has(ROL_ID)) return;

  const ahora = Date.now();
  const ultimoMensaje = cooldown.get(message.author.id);

  if (!ultimoMensaje || ahora - ultimoMensaje > UNA_HORA) {

    message.reply("CALLATE HOMOSEXUAL");
    cooldown.set(message.author.id, ahora);

  }

});

// 🔐 LOGIN

client.login(process.env.TOKEN);

// 🌐 Servidor web

const app = express();

app.get("/", (req, res) => {
  res.send("Bot activo");
});

app.listen(process.env.PORT || 3000);