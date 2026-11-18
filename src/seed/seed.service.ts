import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import * as bcrypt from 'bcrypt';
import { Role, WalletType } from "../generated/prisma/client.js";
import 'dotenv/config';

@Injectable()
export class SeedService implements OnModuleInit {

    constructor(
        private readonly prisma: PrismaService
    ) { }

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

            const admin = await this.prisma.user.create({
                data: {
                    name: "toqa",
                    role: Role.ADMIN,
                    email: "toqa@gmail.com",
                    password: hashedPassword,
                    wallet: {
                        create: {
                            type: WalletType.PLATFORM,
                            balance: 0,
                        }
                    }
                }
            });

            hashedPassword = await bcrypt.hash("12345678", 10);

            const client1 = await this.prisma.user.create({
                data: {
                    name: "Ahmad",
                    role: Role.CLIENT,
                    email: "ahmad@gmail.com",
                    password: hashedPassword,
                    wallet: {
                        create: {
                            balance: 300,
                        }
                    }
                }
            });

            const freelancer1 = await this.prisma.user.create({
                data: {
                    name: "Jamil",
                    role: Role.FREELANCER,
                    email: "jamil@gmail.com",
                    password: hashedPassword,
                    wallet: {
                        create: {
                            balance: 0,
                        }
                    }
                }
            });

            const freelancer2 = await this.prisma.user.create({
                data: {
                    name: "Jamila",
                    role: Role.FREELANCER,
                    email: "jamila@gmail.com",
                    password: hashedPassword,
                    wallet: {
                        create: {
                            balance: 0,
                        }
                    }
                }
            });

            
            const devCategory = await this.prisma.category.upsert({
                where: { name: "Development" },
                update: {},
                create: { name: "Development" },
            });

            const designCategory = await this.prisma.category.upsert({
                where: { name: "Design" },
                update: {},
                create: { name: "Design" },
            });

           
            const project1 = await this.prisma.project.create({
                data: {
                    title: "E-commerce Backend API",
                    description: "Build a scalable NestJS REST API for an online store.",
                    budgetMin: 200,
                    budgetMax : 250 ,
                    clientId: client1.id,
                    categoryId: devCategory.id,
                }
            });

            const project2 = await this.prisma.project.create({
                data: {
                    title: "Modern Brand Logo Design",
                    description: "Need a clean vector logo for a tech startup.",
                    budgetMin: 150 ,
                    budgetMax : 200 ,
                    clientId: client1.id,
                    categoryId: designCategory.id,
                }
            });

            await this.prisma.offer.create({
                data: {
                    amount: 220,
                    durationDays: 7,
                    proposalMessage: "I can deliver this API cleanly with full Swagger docs.",
                    freelancerId: freelancer1.id,
                    projectId: project1.id,
                }
            });

        
            await this.prisma.offer.create({
                data: {
                    amount: 200,
                    durationDays: 5,
                    proposalMessage: "I will design 3 logo concepts with unlimited revisions.",
                    freelancerId: freelancer1.id,
                    projectId: project2.id,
                }
            });

        
            await this.prisma.offer.create({
                data: {
                    amount: 180,
                    durationDays: 4,
                    proposalMessage: "Professional branding designer ready to start immediately.",
                    freelancerId: freelancer2.id,
                    projectId: project2.id,
                }
            });

            console.log("Seeded successfully with admin platform wallet, users, projects, and offers!");
        }
    }

    async isSeeded() {
        const doesExist = await this.prisma.user.findUnique({
            where: { email: "toqa@gmail.com" }
        });
        return !!doesExist;
    }
}