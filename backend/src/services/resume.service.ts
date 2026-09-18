import path from 'path';
import { PDFParse } from 'pdf-parse';
import mongoose from 'mongoose';
import { Application } from '../models/Application.model';
import { IParsedResume, IUserDocument, User } from '../models/User.model';
import { AppError } from '../utils/AppError';
import { StorageService } from './storage.service';

const normalize = (value: string) => value.replace(/\r/g, '').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
const unique = (values: string[]) => [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const skillVocabulary = ['javascript', 'typescript', 'react', 'node.js', 'node', 'express', 'mongodb', 'mongoose', 'python', 'java', 'sql', 'aws', 'docker', 'kubernetes', 'git', 'html', 'css', 'tailwind', 'next.js', 'angular', 'vue', 'c#', 'c++', 'figma'];

const parseStructuredResume = (text: string): IParsedResume => {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || '';
  const headingIndex = (terms: string[]) => lines.findIndex((line) => terms.some((term) => line.toLowerCase() === term));
  const section = (terms: string[]) => { const start = headingIndex(terms); if (start < 0) return []; const output: string[] = []; for (const line of lines.slice(start + 1, start + 8)) { if (/^(education|experience|projects?|skills|certifications?|summary|profile)$/i.test(line)) break; output.push(line); } return output; };
  const skillsSection = section(['skills', 'technical skills', 'core competencies']).join(' ');
  const skills = unique(skillVocabulary.filter((skill) => new RegExp(`(^|[^a-z])${escapeRegExp(skill)}([^a-z]|$)`, 'i').test(`${text} ${skillsSection}`)));
  const entries = (terms: string[]) => section(terms).map((line) => ({ title: line }));
  return { fullName: lines[0]?.length <= 80 && !lines[0]?.includes('@') ? lines[0] : '', email, phone, location: '', summary: section(['summary', 'professional summary', 'profile']).join(' ').slice(0, 1200), skills, education: entries(['education']), experience: entries(['experience', 'work experience', 'employment']), projects: entries(['projects', 'personal projects']), certifications: section(['certifications', 'certificates']) };
};

export class ResumeService {
  static async upload(candidate: IUserDocument, file?: Express.Multer.File) {
    if (!file) throw new AppError('A PDF resume file is required', 400);
    if (file.size === 0) throw new AppError('The uploaded resume is empty', 422);
    if (!file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new AppError('The uploaded file is not a valid PDF', 400);
    let text: string;
    try {
      const parser = new PDFParse({ data: file.buffer });
      try { text = normalize((await parser.getText({ first: 20 })).text); } finally { await parser.destroy(); }
    } catch { throw new AppError('The PDF could not be read. Please upload a valid text-based PDF.', 422); }
    if (text.length < 20) throw new AppError('No readable text was found in this PDF', 422);
    if (text.length > 250_000) throw new AppError('Resume text exceeds the supported size', 422);
    const parsed = parseStructuredResume(text);
    const previous = await User.findById(candidate._id).select('+candidateProfile.resume.storageKey');
    if (!previous) throw new AppError('User not found', 404);
    const { storageKey } = await StorageService.put(candidate._id.toString(), file.originalname, file.buffer);
    const oldKey = previous.candidateProfile?.resume?.storageKey;
    try {
      candidate.candidateProfile = candidate.candidateProfile || {};
      candidate.candidateProfile.resume = { originalFilename: path.basename(file.originalname), storageKey, size: file.size, uploadedAt: new Date(), parseStatus: 'completed', parsedAt: new Date() };
      candidate.candidateProfile.parsedResume = parsed;
      candidate.candidateProfile.parsedSkills = parsed.skills;
      if (!candidate.candidateProfile.skills?.length) candidate.candidateProfile.skills = parsed.skills;
      if (!candidate.phoneNumber && parsed.phone) candidate.phoneNumber = parsed.phone;
      await candidate.save();
    } catch (error) { await StorageService.delete(storageKey); throw error; }
    await StorageService.delete(oldKey);
    return this.publicProfile(candidate);
  }

  static async getResumeFile(candidateId: string, requester: IUserDocument) {
    if (!mongoose.Types.ObjectId.isValid(candidateId)) throw new AppError('Invalid candidate ID format', 400);
    const isOwner = requester._id.toString() === candidateId;
    if (!isOwner && requester.role !== 'admin') {
      const application = await Application.findOne({ candidateId, companyId: requester.companyId });
      if (!application || requester.role !== 'recruiter') throw new AppError('Forbidden: You are not authorized to access this resume', 403);
    }
    const candidate = await User.findById(candidateId).select('+candidateProfile.resume.storageKey');
    const resume = candidate?.candidateProfile?.resume;
    if (!candidate || !resume?.storageKey) throw new AppError('Resume not found', 404);
    return { ...(await StorageService.get(resume.storageKey)), filename: path.basename(resume.originalFilename || 'resume.pdf') };
  }

  static publicProfile(candidate: IUserDocument) { const value = candidate.toObject(); if (value.candidateProfile?.resume) delete (value.candidateProfile.resume as { storageKey?: string }).storageKey; return value; }
}
