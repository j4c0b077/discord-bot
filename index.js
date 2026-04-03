process.env.FFMPEG_PATH = require("ffmpeg-static");

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const express = require("express");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  getVoiceConnection
} = require("@discordjs/voice");

const play = require("play-dl");
const ffmpeg = require("ffmpeg-static");
const ytSearch = require("yt-search");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

const RAWG_KEY = process.env.RAWG_KEY;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const ROL_ID = "784521679731687474";
const cooldown = new Map();
const player = createAudioPlayer();

player.on("error", error => {
  console.error("❌ ERROR DEL PLAYER:", error.message);
});

const queue = new Map();
const UNA_HORA = 1 * 60 * 60 * 1000;

// 🔥 BOT LISTO
client.once("clientReady", () => {

  console.log(`✅ Bot conectado como ${client.user.tag}`);

  // ⏰ MENSAJE CADA 8 HORAS
  const CANAL_ID = "750455777889878046";

  setInterval(() => {
    const canal = client.channels.cache.get(CANAL_ID);
    if (!canal) return;
    canal.send("Zebass y mi paga?");
  }, 8 * 60 * 60 * 1000);

});

// 🎵 PLAY
async function playSong(guild, song) {

  const serverQueue = queue.get(guild.id);

  if (!song) {
    const connection = getVoiceConnection(guild.id);
    if (connection) connection.destroy();
    queue.delete(guild.id);
    return;
  }

  try {
    const stream = await play.stream(song.url);

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true
    });

    player.play(resource);

    player.once(AudioPlayerStatus.Idle, () => {
      serverQueue.songs.shift();
      playSong(guild, serverQueue.songs[0]);
    });

  } catch (error) {
    console.error("Error reproduciendo:", error);
    serverQueue.songs.shift();
    playSong(guild, serverQueue.songs[0]);
  }
}

// 📩 MENSAJES
client.on("messageCreate", async message => {

  if (message.author.bot) return;

  // 🎮 !game
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

      await message.channel.send({
        embeds: [{
          color: 0x8A2BE2,
          title: `🎮 ${game.name}`,
          image: { url: game.background_image },
          description: `⭐ ${game.rating}/5`
        }]
      });

    } catch {
      message.reply("Error buscando el juego.");
    }

    return;
  }

  // 🍥 ?anime
  if (message.content.startsWith("?anime")) {

    const nombre = message.content.slice(6).trim();
    if (!nombre) return message.reply("Escribe un anime.");

    try {

      const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${nombre}&limit=1`);
      if (!res.data.data.length) return message.reply("No encontré ese anime.");

      const anime = res.data.data[0];

      await message.channel.send({
        embeds: [{
          title: `📀 ${anime.title}`,
          description: anime.synopsis?.slice(0, 300) || "Sin descripción",
          image: { url: anime.images.jpg.large_image_url }
        }]
      });

    } catch {
      message.reply("Error buscando anime.");
    }

    return;
  }

 // 🖼 !imagen
if (message.content.startsWith("!imagen")) {

  const query = message.content.slice(7).trim();
  if (!query) return message.reply("Debes escribir algo.");

  try {

    const search = await axios.get(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=images`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    const tokenMatch = search.data.match(/vqd=([\d-]+)/);
    if (!tokenMatch) return message.reply("Error buscando imágenes.");

    const images = await axios.get("https://duckduckgo.com/i.js", {
      params: { q: query, vqd: tokenMatch[1], o: "json" },
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const results = images.data.results;
    if (!results.length) return message.reply("No encontré imágenes.");

    let index = 0;

    const rolesPermitidos = [
      "770408711633371206",
      "914766196019195954",
      "749476087641407518"
    ];

    const usuarioPermitido = "738942627876962304";

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("delete").setLabel("❌").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary)
    );

    const embed = new EmbedBuilder()
      .setTitle(`🖼 ${query}`)
      .setImage(results[index].image);

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async interaction => {

      const member = interaction.member;

      const tieneRol = member.roles.cache.some(r => rolesPermitidos.includes(r.id));
      const esAutor = interaction.user.id === message.author.id;
      const esUsuarioEspecial = interaction.user.id === usuarioPermitido;

      // 🔒 Validación para eliminar
      if (interaction.customId === "delete") {

        if (!esAutor && !tieneRol && !esUsuarioEspecial) {
          return interaction.reply({
            content: "❌ No puedes borrar esta imagen.",
            ephemeral: true
          });
        }

        collector.stop();

        return interaction.update({
          content: "🗑 Imagen eliminada",
          embeds: [],
          components: []
        });
      }

      // 🔁 Navegación
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "❌ Solo el que pidió la imagen puede usar las flechas.",
          ephemeral: true
        });
      }

      if (interaction.customId === "next") index++;
      if (interaction.customId === "prev") index--;

      if (index < 0) index = results.length - 1;
      if (index >= results.length) index = 0;

      embed.setImage(results[index].image);

      await interaction.update({ embeds: [embed], components: [row] });

    });

  } catch {
    message.reply("Error buscando imagen.");
  }

  return;
}

// ❓ !ayuda
if (message.content === "!ayuda") {

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle("📖 Centro de Comandos")
    .setDescription("────────────────────\n\n" +

      "🎮 **Videojuegos**\n" +
      "`!game nombre`\n" +
      "Información de videojuegos.\n\n" +

      "🍥 **Anime**\n" +
      "`?anime nombre`\n" +
      "Información de anime.\n\n" +

      "🖼 **Imágenes**\n" +
      "`!imagen búsqueda`\n" +
      "Buscar imágenes.\n\n" +

      "⚙️ **Utilidades**\n" +
      "`!cagada mensaje`\n" +
      "Enviar mensaje como el bot.\n\n" +

      "────────────────────\n" +
      "*Sistema de ayuda del bot*"
    )
    .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL() });

  await message.channel.send({ embeds: [embed] });

  return;
}

  // 💬 !cagada
  if (message.content.startsWith("!cagada")) {

    const texto = message.content.slice(8).trim();
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
      console.error(error);
    }

    return;
  }

  // 🔒 SISTEMA POR ROL
  if (!message.member) return;
  if (!message.member.roles.cache.has(ROL_ID)) return;

  const ahora = Date.now();
  const ultimo = cooldown.get(message.author.id);

  if (!ultimo || ahora - ultimo > UNA_HORA) {
    message.reply("CALLATE HOMOSEXUAL");
    cooldown.set(message.author.id, ahora);
  }

});

// 🔐 LOGIN
client.login(process.env.TOKEN);

// 🌐 WEB
const app = express();

app.get("/", (req, res) => {
  res.send("Bot activo");
});

app.listen(process.env.PORT || 3000);