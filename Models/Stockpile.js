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
 * @name Stockpile.js
 * @version 2022/11/11
 * @summary Mongoose Model
 **/


import mongoose from "mongoose";

let StockpileSchema = new mongoose.Schema({
  _id:                {type:mongoose.Schema.Types.ObjectId, required:true},
  stockpile_hex:      {type:String, required:true},
  stockpile_town:     {type:String, required:true},
  stockpile_building: {type:String, required:true},
  stockpile_code:     {type:String, required:true},
  stockpile_post:     {type:String},
  stockpile_refresh:  {type:Date, default: new Date()}
});

export default mongoose.model("Stockpile", StockpileSchema, "Stockpiles");
