import mongoose from "mongoose";
import { DateTime } from 'luxon'

const Schema = mongoose.Schema

const AuthorSchema = new Schema({
  first_name: {type: String, required: true, maxLength: 100},
  family_name: {type: String, required: true, maxLength: 100},
  date_of_birth: {type: Date},
  date_of_death: {type: Date}
})

AuthorSchema.virtual('name').get(function() {
  return this.family_name + ', ' + this.first_name
})

AuthorSchema.virtual('lifespan').get(function() {
  let life_str = ''
  if (this.date_of_birth) {
    life_str = DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED)
  }

  life_str += ' - '

  if (this.date_of_death) {
    life_str += DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED)
  } else {
    life_str += 'Present'
  }

  return life_str
})

AuthorSchema.virtual('url').get(function() {
  return '/catalog/author/' + this._id
})

const Author = mongoose.model('Author', AuthorSchema)
export default Author