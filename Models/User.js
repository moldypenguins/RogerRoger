'use strict';
/**
 * Gandalf
 * Copyright (c) 2020 Gandalf Planetarion Tools
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
 * @name User.js
 * @version 2021/11/14
 * @summary Mongoose Model
 **/


import mongoose from 'mongoose';

let UserSchema = new mongoose.Schema({
  _id:                {type:mongoose.Schema.Types.ObjectId, required:true},
  user_id:            {type:Number, unique:true, required:true},
  user_username:      {type:String},
  user_dmChannel:     {type:String}
});

export default mongoose.model('User', UserSchema, 'Users');
