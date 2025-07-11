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
 * @name Town.js
 * @version 2023/11/28
 * @summary Mongoose Model
 **/


import mongoose from "mongoose";

let TownSchema = new mongoose.Schema({
  _id:           {type:mongoose.Schema.Types.ObjectId, required:true},
  town_hex:      {type:String, required:true},
  town_name:     {type:String, required:true},
  town_building: {type:String, required:true},
  town_faction:  {type:String, required:true},
});

export default mongoose.model("Town", TownSchema, "Towns");
