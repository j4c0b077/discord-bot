const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const express = require("express");
const axios = require("axios");

const RAWG_KEY = process.env.RAWG_KEY;
const PEXELS_KEY = process.env.PEXELS_KEY;

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

const FORTNITE_CHANNEL_ID = "1298008832471208008";
const FORTNITE_ROLE_ID = "964381722173116446";

let lastStatus = null;

async function checkFortniteUpdate() {

  try {

    const res = await axios.get("https://status.epicgames.com/api/v2/components.json");
    const components = res.data.components;
    const fortnite = components.find(c => c.name === "Fortnite");

    if (!fortnite) return;

    const estado = fortnite.status;

    if (!lastStatus) {
      lastStatus = estado;
      return;
    }

    if (estado !== lastStatus && estado === "major_outage") {

      const channel = client.channels.cache.get(FORTNITE_CHANNEL_ID);
      if (!channel) return;

      await channel.send({
        content: `<@&${FORTNITE_ROLE_ID}> 🚨 **Fortnite está en actualización**`,
        embeds: [{
          color: 0x2ECC71,
          title: "⚙️ Actualización detectada",
          description:
            "Los servidores de Fortnite entraron en mantenimiento.\n" +
            "Probablemente hay **nuevo parche o temporada**.",
          footer: { text: "Detector automático del bot" }
        }]
      });

    }

    lastStatus = estado;

  } catch (error) {
    console.log("Error revisando actualización:", error.message);
  }

}

client.once('clientReady', () => {

  console.log(`✅ Bot conectado como ${client.user.tag}`);
  setInterval(checkFortniteUpdate, 600000);

});

client.on('messageCreate', async message => {

  if (message.author.bot) return;

  // =========================
  // 🖼 COMANDO !imagen
  // =========================

  if (message.content.startsWith("!imagen")) {

    const query = message.content.slice(7).trim();
    if (!query) return message.reply("Escribe algo para buscar.");

    try {

      const res = await axios.get(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10`,
        {
          headers: { Authorization: PEXELS_KEY }
        }
      );

      const fotos = res.data.photos;
      if (!fotos.length) return message.reply("No encontré imágenes.");

      let index = 0;

      const embed = new EmbedBuilder()
        .setTitle(`🖼 Resultado para: ${query}`)
        .setImage(fotos[index].src.large)
        .setFooter({ text: `Imagen ${index + 1}/${fotos.length}` })
        .setColor(0xFFA500);

      const botones = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅️")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("➡️")
          .setStyle(ButtonStyle.Secondary)
      );

      const msg = await message.channel.send({
        embeds: [embed],
        components: [botones]
      });

      const collector = msg.createMessageComponentCollector({ time: 60000 });

      collector.on("collect", async interaction => {

        if (interaction.user.id !== message.author.id) {
          return interaction.reply({ content: "Solo quien usó el comando puede usar los botones.", ephemeral: true });
        }

        if (interaction.customId === "next") {
          index++;
          if (index >= fotos.length) index = 0;
        }

        if (interaction.customId === "prev") {
          index--;
          if (index < 0) index = fotos.length - 1;
        }

        const nuevoEmbed = new EmbedBuilder()
          .setTitle(`🖼 Resultado para: ${query}`)
          .setImage(fotos[index].src.large)
          .setFooter({ text: `Imagen ${index + 1}/${fotos.length}` })
          .setColor(0xFFA500);

        await interaction.update({
          embeds: [nuevoEmbed],
          components: [botones]
        });

      });

    } catch (error) {

      console.error(error);
      message.reply("Error buscando la imagen.");

    }

    return;
  }

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
  // ❓ COMANDO !ayuda
  // =========================

  if (message.content === "!ayuda") {

    await message.channel.send({
      embeds: [{
        color: 0xE74C3C,
        title: "📖 Centro de Comandos",
        description:
          "━━━━━━━━━━━━━━━━━━\n\n" +
          "🖼 `!imagen búsqueda`\nBuscar imágenes.\n\n" +
          "🎮 `!game nombre`\nInformación de videojuegos.\n\n" +
          "🍥 `?anime nombre`\nInformación de anime.\n\n" +
          "🌐 `!servidores`\nEstado de Fortnite.\n\n" +
          "⚙️ `!cagada mensaje`\nHablar como el bot.\n\n" +
          "❓ `!ayuda`\nLista de comandos.\n\n" +
          "━━━━━━━━━━━━━━━━━━",
        footer: { text: "Sistema de ayuda del bot" }
      }]
    });

    return;
  }

});

client.login(process.env.TOKEN);

const app = express();

app.get("/", (req, res) => {
  res.send("Bot activo");
});

app.listen(process.env.PORT || 3000);