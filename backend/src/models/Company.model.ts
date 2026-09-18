import mongoose, { Document, Model, Schema } from 'mongoose';

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';

export interface ICompany {
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  website?: string;
  industry: string;
  companySize: CompanySize;
  location: string;
  createdBy: mongoose.Types.ObjectId;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICompanyDocument extends ICompany, Document {}

export interface ICompanyModel extends Model<ICompanyDocument> {}

const CompanySchema = new Schema<ICompanyDocument, ICompanyModel>(
  {
    archivedAt: { type: Date, default: null, index: true },
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Company slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Company description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    logoUrl: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
    },
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
      default: '11-50',
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user reference is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helper static to create a URL-friendly unique slug from company name
CompanySchema.statics.generateSlug = async function (
  name: string,
  excludeId?: mongoose.Types.ObjectId | string
): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = baseSlug || 'company';
  let count = 1;

  while (true) {
    const query: any = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await this.findOne(query);
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${count}`;
    count++;
  }
};

export interface ICompanyModelWithStatics extends ICompanyModel {
  generateSlug(name: string, excludeId?: mongoose.Types.ObjectId | string): Promise<string>;
}

export const Company = mongoose.model<ICompanyDocument, ICompanyModelWithStatics>(
  'Company',
  CompanySchema
);
