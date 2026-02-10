import dotenv from "dotenv";
import { emailConfig } from "../Config/mailer.js";
dotenv.config();


export function buildRequestLink(shareId) {
  if (!shareId) return `${emailConfig.frontendUrl}/public/invalid`;
  return `${emailConfig.frontendUrl}/public/${shareId}`;
}
export function completeRequestLink(shareId) {
  if (!shareId) return `${emailConfig.frontendUrl}/client-dashboard/invalid`;
  return `${emailConfig.frontendUrl}/client-dashboard/${shareId}`;
}

export function buildLoginLink() {
  return `${emailConfig.frontendUrl}login`;
   
}
export function buildReUploadLink(shareId) {
  if (!shareId) return `${emailConfig.frontendUrl}/public/invalid`;
  return `${emailConfig.frontendUrl}/public/${shareId}?reupload=true`;
}
