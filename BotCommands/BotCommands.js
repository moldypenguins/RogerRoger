"use strict";
/**
 * Circuit
 * Copyright (c) 2023 Craig Roberts
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
 * @name BotCommands.js
 * @version 2023-11-28
 * @summary bot commands
 **/


import event from "./event.js";
import rolereaction from "./rolereaction.js";
import setup from "./setup.js";
import stockpile from "./stockpile.js";

let BotCommands = {
  event,
  rolereaction,
  setup,
  stockpile
};

export default BotCommands;
