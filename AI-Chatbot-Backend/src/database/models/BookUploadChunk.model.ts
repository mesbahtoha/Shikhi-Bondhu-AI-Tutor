import mongoose, { Schema, InferSchemaType } from 'mongoose';

/** One 3 MB binary slice of a chunked book upload. */
const bookUploadChunkSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'BookUploadSession', required: true, index: true },
    index: { type: Number, required: true },
    data: { type: Buffer, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'book_upload_chunks' }
);

bookUploadChunkSchema.index({ sessionId: 1, index: 1 }, { unique: true });
/** Clean up abandoned chunks after a day. */
bookUploadChunkSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export type BookUploadChunkDocument = InferSchemaType<typeof bookUploadChunkSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BookUploadChunkModel = mongoose.model('BookUploadChunk', bookUploadChunkSchema);
