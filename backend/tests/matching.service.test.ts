import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { IUserDocument } from '../src/models/User.model';
import { MatchingService } from '../src/services/matching.service';

const candidate = (profile: Record<string, unknown>) => ({ candidateProfile: profile }) as unknown as IUserDocument;

describe('deterministic talent matching', () => {
  it('scores identical input consistently and explains missing skills', () => {
    const job = { skillsRequired: ['TypeScript', 'React', 'Docker'], description: 'Build scalable frontend applications with TypeScript and React', experienceLevel: 'mid' };
    const profile = candidate({ skills: ['typescript', 'react'], experienceYears: 3, experience: [{ title: 'Frontend Engineer', description: 'Built scalable React applications' }], education: [{ title: 'BSc' }], projects: [{ title: 'ATS', description: 'React TypeScript app' }] });
    const first = MatchingService.score(job, profile); const second = MatchingService.score(job, profile);
    expect(first).toEqual(second);
    expect(first.matchedSkills).toEqual(['typescript', 'react']);
    expect(first.missingSkills).toEqual(['docker']);
    expect(first.overallScore).toBeGreaterThan(50);
    expect(first.explanation).toContain('decision support only');
  });

  it('handles missing profile data without fabricating qualifications', () => {
    const result = MatchingService.score({ skillsRequired: ['node'], description: 'Node backend', experienceLevel: 'senior' }, candidate({}));
    expect(result.matchedSkills).toEqual([]);
    expect(result.missingSkills).toEqual(['node']);
    expect(result.skillScore).toBe(0);
    expect(result.strengths).toEqual([]);
  });
});
