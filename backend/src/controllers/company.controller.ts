import { Request, Response } from 'express';
import { CompanyService } from '../services/company.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const createCompany = asyncHandler(async (req: Request, res: Response) => {
  const company = await CompanyService.createCompany(req.body, req.user!);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Company profile created successfully',
    data: { company },
  });
});

export const getCompany = asyncHandler(async (req: Request, res: Response) => {
  const company = await CompanyService.getCompanyById(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Company profile retrieved',
    data: { company },
  });
});

export const getMyCompany = asyncHandler(async (req: Request, res: Response) => {
  const company = await CompanyService.getMyCompany(req.user!);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Recruiter company retrieved',
    data: { company },
  });
});

export const updateCompany = asyncHandler(async (req: Request, res: Response) => {
  const company = await CompanyService.updateCompany(req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Company profile updated successfully',
    data: { company },
  });
});

export const deleteCompany = asyncHandler(async (req: Request, res: Response) => {
  await CompanyService.deleteCompany(req.params.id, req.user!);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Company profile archived successfully',
  });
});
