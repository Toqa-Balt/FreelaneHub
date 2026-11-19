import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { Role, WalletType } from '../generated/prisma/client.js';
import 'dotenv/config';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    const isSeeded = await this.isSeeded();
    if (!isSeeded) {
      const password = process.env.ADMIN_PASSWORD;

      if (!password) {
        throw new Error('ADMIN_PASSWORD is missing');
      }

      let hashedPassword = await bcrypt.hash(password, 10);

      // 1. Admin (ID: 1)
      const admin = await this.prisma.user.create({
        data: {
          name: 'toqa',
          role: Role.ADMIN,
          email: 'toqa@gmail.com',
          password: hashedPassword,
          wallet: {
            create: {
              type: WalletType.PLATFORM,
              balance: 0,
            },
          },
        },
      });

      hashedPassword = await bcrypt.hash('12345678', 10);

      // 2. Main Demo Client: Ahmad (ID: 2)
      const client1 = await this.prisma.user.create({
        data: {
          name: 'Ahmad',
          role: Role.CLIENT,
          email: 'ahmad@gmail.com',
          password: hashedPassword,
          wallet: {
            create: {
              balance: 1000,
            },
          },
        },
      });

      // 3. Main Demo Freelancer 1: Jamil (ID: 3)
      const freelancer1 = await this.prisma.user.create({
        data: {
          name: 'Jamil',
          role: Role.FREELANCER,
          email: 'jamil@gmail.com',
          password: hashedPassword,
          wallet: {
            create: {
              balance: 0,
            },
          },
          freelancerProfile: {
            create: {
              bio: 'Full-Stack Web Developer specializing in NestJS, React, and PostgreSQL.',
              hourlyRate: 25,
            },
          },
        },
      });

      // 4. Main Demo Freelancer 2: Leen (ID: 4)
      const freelancer2 = await this.prisma.user.create({
        data: {
          name: 'Leen',
          role: Role.FREELANCER,
          email: 'leen@gmail.com',
          password: hashedPassword,
          wallet: {
            create: {
              balance: 0,
            },
          },
          freelancerProfile: {
            create: {
              bio: 'Senior UI/UX & Brand Identity Designer with 4+ years of experience.',
              hourlyRate: 20,
            },
          },
        },
      });

      // Extra Users for realistic data (IDs: 5, 6, 7)
      const client2 = await this.prisma.user.create({
        data: {
          name: 'Omar',
          role: Role.CLIENT,
          email: 'omar@gmail.com',
          password: hashedPassword,
          wallet: { create: { balance: 800 } },
        },
      });

      const client3 = await this.prisma.user.create({
        data: {
          name: 'Nour',
          role: Role.CLIENT,
          email: 'nour@gmail.com',
          password: hashedPassword,
          wallet: { create: { balance: 600 } },
        },
      });

      const freelancer3 = await this.prisma.user.create({
        data: {
          name: 'Kareem',
          role: Role.FREELANCER,
          email: 'kareem@gmail.com',
          password: hashedPassword,
          wallet: { create: { balance: 0 } },
          freelancerProfile: {
            create: {
              bio: 'Mobile App Developer (Flutter & React Native) and Technical Writer.',
              hourlyRate: 22,
            },
          },
        },
      });

      // 6 Categories (IDs: 1 to 6)
      const devCategory = await this.prisma.category.upsert({
        where: { name: 'Development' },
        update: {},
        create: { name: 'Development' },
      });

      const designCategory = await this.prisma.category.upsert({
        where: { name: 'Design' },
        update: {},
        create: { name: 'Design' },
      });

      const translationCategory = await this.prisma.category.upsert({
        where: { name: 'Translation' },
        update: {},
        create: { name: 'Translation' },
      });

      const marketingCategory = await this.prisma.category.upsert({
        where: { name: 'Marketing' },
        update: {},
        create: { name: 'Marketing' },
      });

      const videoCategory = await this.prisma.category.upsert({
        where: { name: 'Video & Animation' },
        update: {},
        create: { name: 'Video & Animation' },
      });

      const dataAiCategory = await this.prisma.category.upsert({
        where: { name: 'Data & AI' },
        update: {},
        create: { name: 'Data & AI' },
      });

      // Project 1 (ID: 1) -> Main Demo Project for Ahmad
      const project1 = await this.prisma.project.create({
        data: {
          title: 'Modern Brand Logo Design',
          description: 'Need a clean vector logo and brand identity for a tech startup.',
          budgetMin: 150,
          budgetMax: 250,
          clientId: client1.id,
          categoryId: designCategory.id,
        },
      });

      // Offer 1 (ID: 1) -> Jamil's Offer on Project 1
      await this.prisma.offer.create({
        data: {
          amount: 200,
          durationDays: 5,
          proposalMessage: 'I will deliver modern concepts with full source files.',
          freelancerId: freelancer1.id,
          projectId: project1.id,
        },
      });

      // Offer 2 (ID: 2) -> Leen's Offer on Project 1
      await this.prisma.offer.create({
        data: {
          amount: 180,
          durationDays: 4,
          proposalMessage: 'Professional brand designer ready to start immediately.',
          freelancerId: freelancer2.id,
          projectId: project1.id,
        },
      });

      // Remaining 14 Projects (IDs: 2 to 15) distributed across all 6 categories
      const extraProjects = [
        {
          title: 'E-commerce Backend API',
          description: 'Build a scalable NestJS REST API for an online store.',
          budgetMin: 300,
          budgetMax: 450,
          clientId: client1.id,
          categoryId: devCategory.id,
        },
        {
          title: 'Corporate Website Redesign',
          description: 'Full UI/UX overhaul for our B2B SaaS landing page in Figma.',
          budgetMin: 250,
          budgetMax: 400,
          clientId: client2.id,
          categoryId: designCategory.id,
        },
        {
          title: 'Arabic-English Legal Contract Translation',
          description: 'Accurate translation of 15-page software licensing agreements.',
          budgetMin: 100,
          budgetMax: 150,
          clientId: client3.id,
          categoryId: translationCategory.id,
        },
        {
          title: 'Social Media Launch Campaign',
          description: 'Create and manage a 30-day Instagram & LinkedIn ad strategy.',
          budgetMin: 200,
          budgetMax: 350,
          clientId: client2.id,
          categoryId: marketingCategory.id,
        },
        {
          title: '2D Explainer Video for Mobile App',
          description: 'Produce a 60-second animated promo video with voiceover.',
          budgetMin: 220,
          budgetMax: 340,
          clientId: client1.id,
          categoryId: videoCategory.id,
        },
        {
          title: 'Customer Churn Prediction Model',
          description: 'Build a Python ML pipeline to analyze user retention patterns.',
          budgetMin: 350,
          budgetMax: 500,
          clientId: client2.id,
          categoryId: dataAiCategory.id,
        },
        {
          title: 'Flutter Delivery App UI',
          description: 'Convert Figma screens into responsive Flutter widgets.',
          budgetMin: 350,
          budgetMax: 500,
          clientId: client3.id,
          categoryId: devCategory.id,
        },
        {
          title: 'Mobile App Icon & Splash Screen',
          description: 'Design a minimal app icon and animated splash screen.',
          budgetMin: 80,
          budgetMax: 120,
          clientId: client1.id,
          categoryId: designCategory.id,
        },
        {
          title: 'SEO Audit & Content Strategy',
          description: 'Optimize technical SEO and keyword plan for an educational blog.',
          budgetMin: 150,
          budgetMax: 220,
          clientId: client2.id,
          categoryId: marketingCategory.id,
        },
        {
          title: 'Technical Documentation Translation',
          description: 'Translate developer API guides from English to Arabic.',
          budgetMin: 120,
          budgetMax: 180,
          clientId: client3.id,
          categoryId: translationCategory.id,
        },
        {
          title: 'YouTube Tech Channel Intro & Outro',
          description: 'Create motion graphics templates in After Effects.',
          budgetMin: 110,
          budgetMax: 170,
          clientId: client3.id,
          categoryId: videoCategory.id,
        },
        {
          title: 'RAG Chatbot Integration for Support Docs',
          description: 'Connect vector database with LLM API for automated Q&A.',
          budgetMin: 300,
          budgetMax: 420,
          clientId: client1.id,
          categoryId: dataAiCategory.id,
        },
        {
          title: 'PostgreSQL Query Performance Tuning',
          description: 'Analyze slow queries and design composite indexes for high traffic.',
          budgetMin: 200,
          budgetMax: 300,
          clientId: client3.id,
          categoryId: devCategory.id,
        },
        {
          title: 'Pitch Deck Presentation Design',
          description: 'Design a 12-slide investor pitch deck in Figma and PowerPoint.',
          budgetMin: 160,
          budgetMax: 240,
          clientId: client2.id,
          categoryId: designCategory.id,
        },
      ];

      await this.prisma.project.createMany({
        data: extraProjects,
      });

      // Extra offer from Kareem on Project 2
      await this.prisma.offer.create({
        data: {
          amount: 350,
          durationDays: 10,
          proposalMessage: 'Experienced with NestJS and PostgreSQL e-commerce architectures.',
          freelancerId: freelancer3.id,
          projectId: 2,
        },
      });

      console.log('Seeded successfully with 6 categories, 15 projects, demo accounts, and offers!');
      
    }
  }

  async isSeeded() {
    const doesExist = await this.prisma.user.findUnique({
      where: { email: 'toqa@gmail.com' },
    });
    return !!doesExist;
  }
}