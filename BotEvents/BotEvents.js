"use strict";
/**
 * RogerRoger
 * Copyright (c) 2023 The Old Republic - Craig Roberts
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see https://www.gnu.org/licenses/gpl-3.0.html
 *
 * @name BotEvents.js
 * @version 2023-05-20
 * @summary bot events
 **/


//import GuildAuditLogEntryCreate from "./GuildAuditLogEntryCreate.js";
import GuildBanAdd from "./GuildBanAdd.js";
import GuildBanRemove from "./GuildBanRemove.js";
import GuildCreate from "./GuildCreate.js";
import GuildMemberAdd from "./GuildMemberAdd.js";
import GuildMemberRemove from "./GuildMemberRemove.js";
import GuildMemberUpdate from "./GuildMemberUpdate.js";
import GuildRoleCreate from "./GuildRoleCreate.js";
import GuildRoleDelete from "./GuildRoleDelete.js";
import GuildRoleUpdate from "./GuildRoleUpdate.js";
import MessageDelete from "./MessageDelete.js";
import VoiceStateUpdate from "./VoiceStateUpdate.js";


let BotEvents = {
  //GuildAuditLogEntryCreate,
  GuildBanAdd,
  GuildBanRemove,
  GuildCreate,
  GuildMemberAdd,
  GuildMemberRemove,
  GuildMemberUpdate,
  GuildRoleCreate,
  GuildRoleDelete,
  GuildRoleUpdate,
  MessageDelete,
  VoiceStateUpdate
};

export default BotEvents;

