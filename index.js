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
// 🟢 FORTNITE UPDATE DETECTOR
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
        content: `<@&${FORTNITE_ROLE_ID}> 🚨 **Nueva actualización de Fortnite detectada**`,
        embeds: [
          {
            color: 0x2ECC71,
            title: noticia.title,
            description: noticia.body,
            image: { url: noticia.image },
            footer: { text: "Actualización detectada automáticamente" }
          }
        ]
      });

      lastNewsHash = newHash;

    }

  } catch (error) {
    console.error("Error revisando Fortnite:", error.message);
  }

}

// 🔥 Bot listo
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
        embeds: [
          {
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
          }
        ]
      });

    } catch (error) {

      console.error(error);
      message.reply("Hubo un error buscando el juego.");

    }

    return;
  }

  // =========================
  // 🔵 COMANDO !fortnite jugador
  // =========================

  if (message.content.startsWith("!fortnite")) {

    const jugador = message.content.slice(9).trim();

    if (!jugador) {
      return message.reply("Ejemplo: !fortnite Ninja");
    }

    try {

      const statsResponse = await axios.get("https://fortnite-api.com/v2/stats/br/v2", {
        params: { name: jugador }
      });

      const data = statsResponse.data.data;
      const stats = data.stats.all.overall;

      const winrate = ((stats.wins / stats.matches) * 100).toFixed(1);

      const avatar = `https://api.dicebear.com/7.x/bottts/png?seed=${jugador}`;

      await message.channel.send({

        embeds: [
          {
            color: 0x3498DB,
            title: `📊 ${jugador}`,
            thumbnail: { url: avatar },

            description:
              "━━━━━━━━━━━━━━━━━━\n" +
              `🏆 **Victorias:** ${stats.wins}\n\n` +
              `🎮 **Partidas:** ${stats.matches}\n\n` +
              `⚔️ **Kills:** ${stats.kills}\n\n` +
              `🎯 **K/D:** ${stats.kd}\n\n` +
              `📈 **Winrate:** ${winrate}%\n\n` +
              `⭐ **Nivel:** ${data.battlePass.level}\n` +
              "━━━━━━━━━━━━━━━━━━",

            footer: { text: "Estadísticas de Fortnite" }

          }
        ]

      });

    } catch (error) {

      message.reply("No pude encontrar ese jugador.");

    }

    return;
  }

  // =========================
  // 🌐 COMANDO !servidores
  // =========================

  if (message.content === "!servidores") {

    try {

      const response = await axios.get("https://fortnite-api.com/v2/status");
      const estado = response.data.status;

      if (estado === "UP") message.channel.send("🟢 online");
      else if (estado === "DOWN") message.channel.send("🔴 caídos");
      else message.channel.send("🟡 mantenimiento");

    } catch {

      message.channel.send("⚠️ No pude comprobar los servidores.");

    }

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