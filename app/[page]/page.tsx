import { notFound } from 'next/navigation';
import { ToolPage } from '@/components/ToolPage';
const pages=['dashboard','onboarding','assistant','planner','indoor-air','transport','impact','what-if','community','settings'];
export default async function Page({params}:{params:Promise<{page:string}>}){const {page}=await params;if(!pages.includes(page))notFound();return <ToolPage page={page}/>;}
