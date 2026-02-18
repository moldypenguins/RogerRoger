/**
 * @name stockpile.ts
 * @version 2026-02-03
 * @summary Stockpile commands
 **/

import util from "node:util"
import type { Client, Guild, GuildMember, Interaction, Message, GuildMemberRoleManager, User } from "discord.js"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  time,
  Collection,
  Utils
} from "discord.js"

import Config from "../config"
import type { DiscordCommand, DiscordGuildData, DiscordUserData, FoxholeStockpileData, FoxholeTownData } from "../types"
import { Databank, DiscordGuild, DiscordUser, FoxholeStockpile, FoxholeTown } from "../databank"

const BuildingEmojiMap = {
  AircraftDepot: "<:aircraftdepot:1469568452573528177>",
  Seaport: "<:seaport:1469568345757057155>",
  StorageDepot: "<:storagedepot:1469568245509128352>"
} as const
type BuildingType = keyof typeof BuildingEmojiMap
const getBuildingEmoji = (type: BuildingType) => BuildingEmojiMap[type]
const isBuildingType = (value: string): value is BuildingType => {
  return Object.keys(BuildingEmojiMap).includes(value)
}

const commandStockpile: DiscordCommand = {
  data: new SlashCommandBuilder()
    .setName("stockpile")
    .setDescription("Create a new stockpile.")
    .setContexts([InteractionContextType.Guild])
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands)
    .addStringOption((option) =>
      option.setName("location").setDescription("The stockpile location.").setRequired(true).setAutocomplete(true)
    )
    .addStringOption((option) =>
      option.setName("code").setDescription("The stockpile code.").setRequired(true).setMinLength(6).setMaxLength(6)
    ),
  async execute(client: Client, interaction: Interaction): Promise<void> {
    //console.log(`INT: ${util.inspect(interaction, true, 2, true)}`);
    let _guild: DiscordGuildData | null = await DiscordGuild.findOne({ id: interaction.guildId })
    if (!_guild) return

    if (interaction.isChatInputCommand()) {
      let _location: string | null = interaction.options.getString("location")
      let _code: string | null = interaction.options.getString("code")
      let _date: Date = new Date()

      let _town: FoxholeTownData | null = await FoxholeTown.findOne({ _id: _location })
      if (!_town) return

      let _member_user: User = interaction.member?.user as User
      let _user = await DiscordUser.findOne({ id: _member_user.id })
      if (!_user) return

      let _stockpile: FoxholeStockpileData = await new FoxholeStockpile({
        _id: new Databank.Types.ObjectId(),
        guild: _guild._id,
        town: _town._id,
        code: _code,
        updatedBy: _user._id
      }).save()

      _date.setDate(_date.getDate() + 2)

      // Ensure stockpiles channel populated
      if (!_guild.stockpilesChannelId || _guild.stockpilesChannelId.length <= 0) {
        if (Config.debug) console.log("Invalid log channel.")
        return
      }

      let building = "🏭"
      let building_type = _town.building.replaceAll(" ", "")
      if (isBuildingType(building_type)) building = getBuildingEmoji(building_type)

      const _stockchan = client.channels.cache.get(_guild.stockpilesChannelId)
      if (_stockchan?.isTextBased() && "send" in _stockchan) {
        //send new message
        _stockchan
          .send({
            embeds: [
              {
                color: 0x2b2d31,
                author: {
                  name: `${_town.hex} - ${_town.name}`,
                  icon_url: "https://media.discordapp.net/stickers/1469579249919856670.webp?size=32&quality=lossless"
                },
                fields: [
                  {
                    name: "",
                    value: building,
                    inline: true
                  },
                  {
                    name: "",
                    value: `${_stockpile.code}`,
                    inline: true
                  },
                  {
                    name: "",
                    value: `*Expires ${time(_date, "R")}*`,
                    inline: true
                  }
                ],
                footer: {
                  text: _member_user.tag,
                  icon_url: "https://media.discordapp.net/stickers/1469578795571740845.webp?size=32&quality=lossless"
                }
              }
            ],
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId(`stockpile_refresh_${_stockpile._id}`)
                  .setLabel("Refresh")
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setCustomId(`stockpile_delete_${_stockpile._id}`)
                  .setLabel("Delete")
                  .setStyle(ButtonStyle.Danger)
              )
            ]
          })
          .then(async (message: Message) => {
            await FoxholeStockpile.updateOne({ _id: _stockpile._id }, { $set: { messageId: message.id } })
          })
      }

      interaction.reply({
        embeds: [
          {
            color: _guild.embedColor,
            title: "Stockpile Added!"
          }
        ],
        ephemeral: true
      })
    } else if (interaction.isAutocomplete()) {
      let _value = interaction.options.getFocused()
      let _choices = await FoxholeTown.find()
      let _filtered = _choices.filter((c) => c.name.toLowerCase().startsWith(_value.toLowerCase()))
      if (_filtered.length > 25) {
        _filtered = _filtered.slice(0, 25)
      }

      await interaction.respond(
        _filtered.map((c) => ({
          name: `${c.building} - ${c.hex} > ${c.name}`,
          value: c._id
        }))
      )
    } else if (interaction.isButton()) {
      //console.log(`INTERACTION: ${util.inspect(interaction, true, 1, true)}`);
      let _command = interaction.customId.split("_")[1]

      if (_command == "refresh") {
        let _sid = new Databank.Types.ObjectId(interaction.customId.split("_")[2])

        if (await FoxholeStockpile.exists({ _id: _sid })) {
          let _refresh = new Date()

          let _member_user: User = interaction.member?.user as User
          let _user = await DiscordUser.findOne({ id: _member_user.id })
          if (!_user) return

          await FoxholeStockpile.updateOne({ _id: _sid }, { $set: { updatedBy: _user._id } })
          _refresh.setDate(_refresh.getDate() + 2)

          let _stockpile = await FoxholeStockpile.findOne({ _id: _sid })

          if (!_stockpile) {
            console.error(`Unable to find stockpile with id ${_sid}`)
            return
          }

          let building: string = "🏭"
          let town: FoxholeTownData = _stockpile.town
          let building_type = town.building.replaceAll(" ", "")
          if (isBuildingType(building_type)) building = getBuildingEmoji(building_type)

          //console.log(`STOCK: ${util.inspect(interaction.message.embeds[0], true, null, true)}`);
          let _embed = EmbedBuilder.from(interaction.message.embeds[0]).data
          _embed.fields = [
            {
              name: "",
              value: building,
              inline: true
            },
            {
              name: "",
              value: `${_stockpile.code}`,
              inline: true
            },
            {
              name: "",
              value: `*Expires ${time(_refresh, "R")}*`,
              inline: true
            }
          ]
          _embed.footer = {
            text: _member_user.tag,
            icon_url: "https://media.discordapp.net/stickers/1469578795571740845.webp?size=32&quality=lossless"
          }

          interaction.message.edit({
            embeds: [_embed]
          })
          interaction.deferUpdate()
        }
      } else if (_command == "delete") {
        let _roles = interaction.member?.roles as GuildMemberRoleManager

        if (!_roles.cache.has("1263210048968982711")) {
          interaction.reply({
            embeds: [
              {
                color: 0x0099ff,
                title: "You do not have permissions to perform this action."
              }
            ],
            ephemeral: true
          })
        } else {
          let _sid = interaction.customId.split("_")[2]

          const yes = new ButtonBuilder()
            .setCustomId(`stockpile_confirm_yes_${_sid}`)
            .setLabel("Yes")
            .setStyle(ButtonStyle.Success)

          const no = new ButtonBuilder()
            .setCustomId(`stockpile_confirm_no_${_sid}`)
            .setLabel("No")
            .setStyle(ButtonStyle.Danger)

          interaction.reply({
            embeds: [
              {
                color: 0x0099ff,
                title: "Are you sure?"
              }
            ],
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents(yes, no)],
            ephemeral: false
          })
        }
      } else if (_command == "confirm") {
        let _action = interaction.customId.split("_")[2]
        let _sid = new Databank.Types.ObjectId(interaction.customId.split("_")[3])

        if (_action == "yes") {
          if (_guild.stockpilesChannelId && (await FoxholeStockpile.exists({ _id: _sid }))) {
            //console.log(`SID: ${util.inspect(interaction.message.id, true, 1, true)}`);
            let _stockpile: FoxholeStockpileData | null = await FoxholeStockpile.findOne({ _id: _sid })
            if (_stockpile && _stockpile.messageId) {
              const _stockchan = client.channels.cache.get(_guild.stockpilesChannelId)
              if (_stockchan?.isTextBased() && "send" in _stockchan) {
                //send new message
                _stockchan.messages.fetch(_stockpile.messageId).then(async (message: Message) => {
                  message.delete()
                  await FoxholeStockpile.deleteOne({ _id: _sid })
                })
              }
            }
          }
        }
        interaction.message.delete()
        interaction.deferUpdate()
      }
    }
  }
}

export default commandStockpile
