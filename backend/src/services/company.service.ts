import mongoose from 'mongoose';
import { transaction } from '../utils/transaction';
import { Company, ICompanyDocument, ICompanyModelWithStatics } from '../models/Company.model';
import { User, IUserDocument } from '../models/User.model';
import { Job } from '../models/Job.model';
import { AppError } from '../utils/AppError';
import { CreateCompanyInput, UpdateCompanyInput } from '../validators/company.validator';

export class CompanyService {
  static async createCompany(
    input: CreateCompanyInput,
    user: IUserDocument
  ): Promise<ICompanyDocument> {
    if (user.companyId) {
      const existingCompany = await Company.findById(user.companyId);
      if (existingCompany && !existingCompany.archivedAt) {
        throw new AppError(
          `You are already associated with company '${existingCompany.name}'. A recruiter can only manage one company.`,
          409
        );
      }
    }

    const companyModel = Company as unknown as ICompanyModelWithStatics;
    const slug = await companyModel.generateSlug(input.name);

    return transaction(async (session) => {
      const [company] = await Company.create([{ ...input, slug, createdBy: user._id }], { session });
      const linked = await User.updateOne({ _id: user._id, companyId: user.companyId ?? null }, { $set: { companyId: company._id } }, { session });
      if (!linked.modifiedCount) throw new AppError('Company membership changed. Please retry.', 409);
      return company;
    });
  }

  static async getCompanyById(id: string): Promise<ICompanyDocument> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid company ID format', 400);
    }

    const company = await Company.findById(id);
    if (!company || company.archivedAt) {
      throw new AppError('Company not found', 404);
    }

    return company;
  }

  static async getMyCompany(user: IUserDocument): Promise<ICompanyDocument | null> {
    if (!user.companyId) {
      return null;
    }

    const company = await Company.findById(user.companyId);
    return company?.archivedAt ? null : company;
  }

  static async updateCompany(
    id: string,
    input: UpdateCompanyInput
  ): Promise<ICompanyDocument> {
    const companyModel = Company as unknown as ICompanyModelWithStatics;
    const updatePayload: any = { ...input };

    if (input.name) {
      updatePayload.slug = await companyModel.generateSlug(input.name, id);
    }

    const updatedCompany = await Company.findOneAndUpdate(
      { _id: id, archivedAt: null },
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      throw new AppError('Company not found', 404);
    }

    return updatedCompany;
  }

  static async deleteCompany(id: string, _user: IUserDocument): Promise<void> {
    await transaction(async (session) => {
      const company = await Company.findOneAndUpdate({ _id: id, archivedAt: null }, { $set: { archivedAt: new Date() } }, { session });
      if (!company) throw new AppError('Company not found', 404);
      await Job.updateMany({ companyId: company._id }, { $set: { status: 'closed', archivedAt: new Date() } }, { session });
      await User.updateMany({ companyId: company._id }, { $set: { companyId: null } }, { session });
    });
  }
}
