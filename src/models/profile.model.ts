import { Schema, model, Document, Types } from "mongoose";

export interface IProfile extends Document {
  user: Types.ObjectId;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
}

const profileSchema = new Schema<IProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: String,
    avatar: String,
  },
  { timestamps: true }
);

export const Profile = model<IProfile>("Profile", profileSchema);
