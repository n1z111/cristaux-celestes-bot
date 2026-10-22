
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const fs = require("node:fs");
const path = require("node:path");

// ==========================================
// CONFIGURATION : REMPLACE LES 3 VALEURS
// ==========================================

const CONFIG = {
  token: "MTU1NjI0MTYyNDQzNzEwNDcxMQ.Gwxmve._SIxqIbpviPIFL8tiOdlqqcxkKzRLVxL44rkD4",
  clientId: "1556241624437104711",
  guildId: "1378151053333237780",

  logsChannel: "1557076709919035412",
  welcomeChannel: "1558159922170957914",
  ticketCategory: "1556270570318856192",

  staffRoles: [
    "1529469109723730030",
    "1529468668101005546",
    "1529468400189968424",
    "1529455541347287141",
    "1529455152124268715",
    "1529454736724590652",
    "1529454538736795698"
  ]
};

// ==========================================
// BOT
// ==========================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const BLUE = 0x5865F2;
const WARNINGS_FILE = path.join(__dirname, "warnings.json");

if (!fs.existsSync(WARNINGS_FILE)) {
  fs.writeFileSync(WARNINGS_FILE, "{}");
}

function readWarnings() {
  try {
    return JSON.parse(fs.readFileSync(WARNINGS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveWarnings(data) {
  fs.writeFileSync(WARNINGS_FILE, JSON.stringify(data, null, 2));
}

function embed(title, description) {
  return new EmbedBuilder()
    .setColor(BLUE)
    .setTitle("✨ " + title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: "Cristaux Célestes" });
}

async function logAction(guild, description) {
  const channel = guild.channels.cache.get(CONFIG.logsChannel);
  if (!channel) return;

  await channel.send({
    embeds: [embed("Journal de modération", description)]
  }).catch(() => {});
}

function isStaff(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
    CONFIG.staffRoles.some(roleId => member.roles.cache.has(roleId));
}

async function replyError(interaction, message) {
  const response = { content: "❌ " + message, ephemeral: true };

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(response).catch(() => {});
  }

  return interaction.reply(response).catch(() => {});
}

// ==========================================
// COMMANDES SLASH
// ==========================================

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Vérifier si le bot répond"),

  new SlashCommandBuilder()
    .setName("aide")
    .setDescription("Afficher les commandes du bot"),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Afficher les informations du serveur"),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Afficher les informations d'un membre")
    .addUserOption(o =>
      o.setName("membre").setDescription("Membre à consulter").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Afficher l'avatar d'un membre")
    .addUserOption(o =>
      o.setName("membre").setDescription("Membre").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("membercount")
    .setDescription("Afficher le nombre de membres"),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannir un membre")
    .addUserOption(o =>
      o.setName("membre").setDescription("Membre à bannir").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("raison").setDescription("Raison du bannissement").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulser un membre")
    .addUserOption(o =>
      o.setName("membre").setDescription("Membre à expulser").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("raison").setDescription("Raison").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Avertir un membre")
    .addUserOption(o =>
      o.setName("membre").setDescription("Membre").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("raison").setDescription("Raison").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warns")
    .setDescription("Consulter les avertissements d'un membre")
    .addUserOption(o =>
      o.setName("membre").setDescription("Membre").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Rendre un membre temporairement muet")
    .addUserOption(o =>
      o.setName("membre").setDescription("Membre").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("minutes").setDescription("Durée en minutes").setMinValue(1).setMaxValue(40320).setRequired(true)
    )
    .addStringOption(o =>
      o.setName("raison").setDescription("Raison").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Retirer le timeout d'un membre")
    .addUserOption(o =>
      o.setName("membre").setDescription("Membre").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Supprimer des messages")
    .addIntegerOption(o =>
      o.setName("nombre").setDescription("Nombre de messages (1 à 100)").setMinValue(1).setMaxValue(100).setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Publier une annonce")
    .addStringOption(o =>
      o.setName("message").setDescription("Contenu de l'annonce").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ticket-setup")
    .setDescription("Installer le panneau de création de tickets")
];

const rest = new REST({ version: "10" }).setToken(CONFIG.token);

// ==========================================
// DÉMARRAGE ET ENREGISTREMENT DES COMMANDES
// ==========================================

client.once("ready", async () => {
  console.log(`✅ Connecté : ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CONFIG.clientId, CONFIG.guildId),
      { body: commands.map(command => command.toJSON()) }
    );

    console.log("✅ Toutes les commandes slash sont enregistrées.");
  } catch (error) {
    console.error("❌ Erreur d'enregistrement des commandes :", error);
  }
});

// ==========================================
// ARRIVÉES ET DÉPARTS
// ==========================================

client.on("guildMemberAdd", async member => {
  const channel = member.guild.channels.cache.get(CONFIG.welcomeChannel);
  if (!channel) return;

  const welcome = embed(
    "Bienvenue dans Cristaux Célestes !",
    `🌟 Bienvenue ${member} !\n\nNous sommes heureux de t'accueillir parmi nous.\n\n👥 Tu es notre **${member.guild.memberCount}e membre** !`
  ).setThumbnail(member.user.displayAvatarURL({ size: 256 }));

  await channel.send({ embeds: [welcome] }).catch(console.error);
});

client.on("guildMemberRemove", async member => {
  const channel = member.guild.channels.cache.get(CONFIG.welcomeChannel);
  if (!channel) return;

  const goodbye = embed(
    "Un membre nous quitte",
    `🌙 **${member.user.tag}** a quitté le serveur.\n\n👥 Membres restants : **${member.guild.memberCount}**`
  ).setThumbnail(member.user.displayAvatarURL({ size: 256 }));

  await channel.send({ embeds: [goodbye] }).catch(console.error);
});

// ==========================================
// INTERACTIONS
// ==========================================

client.on("interactionCreate", async interaction => {
  try {
    // ---------- BOUTONS ----------

    if (interaction.isButton()) {
      if (interaction.customId === "ticket_open") {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        if (!guild) {
          return interaction.editReply("❌ Serveur introuvable.");
        }

        const existing = guild.channels.cache.find(channel =>
          channel.type === ChannelType.GuildText &&
          channel.parentId === CONFIG.ticketCategory &&
          channel.topic === `ticket-owner:${interaction.user.id}`
        );

        if (existing) {
          return interaction.editReply(`❌ Tu as déjà un ticket ouvert : ${existing}`);
        }

        const category = guild.channels.cache.get(CONFIG.ticketCategory);
        if (!category) {
          return interaction.editReply("❌ La catégorie des tickets est introuvable. Vérifie son ID.");
        }

        const permissions = [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          }
        ];

        for (const roleId of CONFIG.staffRoles) {
          permissions.push({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });
        }

        const ticket = await guild.channels.create({
          name: `ticket-${interaction.user.username}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 90),
          type: ChannelType.GuildText,
          parent: category.id,
          topic: `ticket-owner:${interaction.user.id}`,
          permissionOverwrites: permissions
        });

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_close")
            .setLabel("Fermer le ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger)
        );

        await ticket.send({
          content: `${interaction.user} Bienvenue ! Explique ta demande à l'équipe.`,
          embeds: [
            embed("Ticket ouvert", "Un membre du staff viendra t'aider dès que possible.")
          ],
          components: [closeRow]
        });

        await logAction(guild, `🎫 Ticket ouvert par ${interaction.user.tag} : ${ticket}`);

        return interaction.editReply(`✅ Ton ticket a été créé : ${ticket}`);
      }

      if (interaction.customId === "ticket_close") {
        const channel = interaction.channel;

        if (!channel || !channel.topic?.startsWith("ticket-owner:")) {
          return replyError(interaction, "Ce salon n'est pas un ticket reconnu.");
        }

        const ownerId = channel.topic.split(":")[1];

        if (interaction.user.id !== ownerId && !isStaff(interaction.member)) {
          return replyError(interaction, "Seul l'auteur du ticket ou le staff peut le fermer.");
        }

        await interaction.reply({
          embeds: [embed("Ticket fermé", `Ticket fermé par ${interaction.user}.`)],
          components: []
        });

        await channel.permissionOverwrites.edit(ownerId, {
          SendMessages: false
        }).catch(console.error);

        await channel.setName(`ferme-${channel.name}`.slice(0, 100)).catch(console.error);
        await logAction(interaction.guild, `🔒 Ticket fermé par ${interaction.user.tag}.`);
        return;
      }

      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName, guild, member } = interaction;

    // ---------- COMMANDES PUBLIQUES ----------

    if (commandName === "ping") {
      return interaction.reply(`🏓 Pong ! Latence : ${client.ws.ping} ms.`);
    }

    if (commandName === "aide") {
      const help = embed(
        "Commandes disponibles",
        [
          "**Général**",
          "`/ping` — Vérifier le bot",
          "`/aide` — Voir cette aide",
          "`/serverinfo` — Informations du serveur",
          "`/userinfo` — Informations d'un membre",
          "`/avatar` — Avatar d'un membre",
          "`/membercount` — Nombre de membres",
          "",
          "**Modération — réservée au staff**",
          "`/ban`, `/kick`, `/warn`, `/warns`",
          "`/timeout`, `/untimeout`, `/clear`",
          "`/announce` — Publier une annonce",
          "",
          "**Tickets**",
          "`/ticket-setup` — Installer le panneau des tickets"
        ].join("\n")
      );

      return interaction.reply({ embeds: [help], ephemeral: true });
    }

    if (commandName === "serverinfo") {
      return interaction.reply({
        embeds: [
          embed(
            guild.name,
            `👥 Membres : **${guild.memberCount}**\n🆔 ID : **${guild.id}**\n📅 Créé le : <t:${Math.floor(guild.createdTimestamp / 1000)}:D>`
          ).setThumbnail(guild.iconURL({ size: 256 }))
        ]
      });
    }

    if (commandName === "userinfo") {
      const user = interaction.options.getUser("membre") || interaction.user;
      const targetMember = await guild.members.fetch(user.id).catch(() => null);

      return interaction.reply({
        embeds: [
          embed(
            "Informations du membre",
            `👤 Membre : ${user}\n🆔 ID : **${user.id}**\n📅 Compte créé : <t:${Math.floor(user.createdTimestamp / 1000)}:D>\n📥 Arrivée sur le serveur : ${targetMember ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:D>` : "Inconnue"}`
          ).setThumbnail(user.displayAvatarURL({ size: 256 }))
        ]
      });
    }

    if (commandName === "avatar") {
      const user = interaction.options.getUser("membre") || interaction.user;

      return interaction.reply({
        embeds: [
          embed("Avatar de " + user.username, `[Ouvrir l'image](${user.displayAvatarURL({ size: 1024 })})`)
            .setImage(user.displayAvatarURL({ size: 1024 }))
        ]
      });
    }

    if (commandName === "membercount") {
      return interaction.reply(`👥 Cristaux Célestes compte **${guild.memberCount} membres**.`);
    }

    // ---------- COMMANDES STAFF ----------

    const staffCommands = [
      "ban", "kick", "warn", "warns", "timeout",
      "untimeout", "clear", "announce", "ticket-setup"
    ];

    if (staffCommands.includes(commandName) && !isStaff(member)) {
      return replyError(interaction, "Tu n'as pas le rôle nécessaire pour utiliser cette commande.");
    }

    if (commandName === "ban") {
      const user = interaction.options.getUser("membre");
      const reason = interaction.options.getString("raison") || "Aucune raison précisée";
      const target = await guild.members.fetch(user.id).catch(() => null);

      if (target && !target.bannable) {
        return replyError(interaction, "Je ne peux pas bannir ce membre. Vérifie mes permissions et la hiérarchie des rôles.");
      }

      await guild.members.ban(user.id, { reason });
      await interaction.reply(`🔨 **${user.tag}** a été banni. Raison : ${reason}`);
      await logAction(guild, `🔨 ${user.tag} a été banni par ${interaction.user.tag}.\nRaison : ${reason}`);
      return;
    }

    if (commandName === "kick") {
      const user = interaction.options.getUser("membre");
      const reason = interaction.options.getString("raison") || "Aucune raison précisée";
      const target = await guild.members.fetch(user.id).catch(() => null);

      if (!target) return replyError(interaction, "Ce membre n'est pas sur le serveur.");
      if (!target.kickable) return replyError(interaction, "Je ne peux pas expulser ce membre. Vérifie mes permissions et la hiérarchie des rôles.");

      await target.kick(reason);
      await interaction.reply(`👢 **${user.tag}** a été expulsé. Raison : ${reason}`);
      await logAction(guild, `👢 ${user.tag} a été expulsé par ${interaction.user.tag}.\nRaison : ${reason}`);
      return;
    }

    if (commandName === "warn") {
      const user = interaction.options.getUser("membre");
      const reason = interaction.options.getString("raison");
      const data = readWarnings();

      if (!data[user.id]) data[user.id] = [];
      data[user.id].push({
        reason,
        moderator: interaction.user.tag,
        date: new Date().toISOString()
      });

      saveWarnings(data);

      await interaction.reply(`⚠️ **${user.tag}** a reçu un avertissement.\nRaison : ${reason}\nTotal : **${data[user.id].length}**`);
      await logAction(guild, `⚠️ ${user.tag} averti par ${interaction.user.tag}.\nRaison : ${reason}`);
      return;
    }

    if (commandName === "warns") {
      const user = interaction.options.getUser("membre");
      const data = readWarnings();
      const warnings = data[user.id] || [];

      const description = warnings.length
        ? warnings.map((w, i) => `**${i + 1}.** ${w.reason}\nModérateur : ${w.moderator}\nDate : ${w.date}`).join("\n\n")
        : "Aucun avertissement enregistré.";

      return interaction.reply({
        embeds: [embed(`Avertissements de ${user.tag}`, description)],
        ephemeral: true
      });
    }

    if (commandName === "timeout") {
      const user = interaction.options.getUser("membre");
      const minutes = interaction.options.getInteger("minutes");
      const reason = interaction.options.getString("raison") || "Aucune raison précisée";
      const target = await guild.members.fetch(user.id).catch(() => null);

      if (!target) return replyError(interaction, "Ce membre n'est pas sur le serveur.");
      if (!target.moderatable) return replyError(interaction, "Je ne peux pas appliquer un timeout à ce membre.");

      await target.timeout(minutes * 60 * 1000, reason);
      await interaction.reply(`🔇 **${user.tag}** est en timeout pendant **${minutes} minutes**.\nRaison : ${reason}`);
      await logAction(guild, `🔇 Timeout de ${user.tag} par ${interaction.user.tag} : ${minutes} minutes.\nRaison : ${reason}`);
      return;
    }

    if (commandName === "untimeout") {
      const user = interaction.options.getUser("membre");
      const target = await guild.members.fetch(user.id).catch(() => null);

      if (!target) return replyError(interaction, "Ce membre n'est pas sur le serveur.");
      if (!target.moderatable) return replyError(interaction, "Je ne peux pas retirer le timeout de ce membre.");

      await target.timeout(null);
      await interaction.reply(`🔊 Le timeout de **${user.tag}** a été retiré.`);
      await logAction(guild, `🔊 Timeout retiré pour ${user.tag} par ${interaction.user.tag}.`);
      return;
    }

    if (commandName === "clear") {
      const amount = interaction.options.getInteger("nombre");

      if (!interaction.channel || !interaction.channel.isTextBased() || !interaction.channel.bulkDelete) {
        return replyError(interaction, "Cette commande ne fonctionne pas dans ce salon.");
      }

      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.reply({
        content: `🧹 **${deleted.size}** messages supprimés.`,
        ephemeral: true
      });

      await logAction(guild, `🧹 ${deleted.size} messages supprimés par ${interaction.user.tag} dans ${interaction.channel}.`);
      return;
    }

    if (commandName === "announce") {
      const message = interaction.options.getString("message");

      await interaction.channel.send({
        embeds: [embed("Annonce officielle", message)]
      });

      await interaction.reply({ content: "✅ Annonce publiée.", ephemeral: true });
      await logAction(guild, `📢 Annonce publiée par ${interaction.user.tag}.`);
      return;
    }

    if (commandName === "ticket-setup") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_open")
          .setLabel("Ouvrir un ticket")
          .setEmoji("🎫")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.channel.send({
        embeds: [
          embed(
            "Centre de support",
            "Besoin d'aide ? Clique sur le bouton ci-dessous pour créer un salon privé avec l'équipe.\n\n✨ L'équipe Cristaux Célestes te répondra dès que possible."
          )
        ],
        components: [row]
      });

      return interaction.reply({
        content: "✅ Le panneau des tickets a été installé.",
        ephemeral: true
      });
    }
  } catch (error) {
    console.error("Erreur interaction :", error);
    await replyError(
      interaction,
      "La commande a échoué. Vérifie les permissions du bot, la hiérarchie des rôles et les IDs configurés."
    );
  }
});

// ==========================================
// ERREURS ET CONNEXION
// ==========================================

client.on("error", error => {
  console.error("Erreur Discord :", error);
});

client.login(CONFIG.token).catch(error => {
  console.error("❌ Erreur de connexion du bot :", error);
});