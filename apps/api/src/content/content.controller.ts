import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common"

import { AdminGuard } from "../auth/admin.guard"
import { ContentService } from "./content.service"
import { MoveDto, UpsertFaqDto, UpsertFeatureDto, UpsertTestimonialDto } from "./dto/content.dto"

@Controller("content")
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get("features")
  features() {
    return this.content.listFeatures()
  }

  @Get("faqs")
  faqs() {
    return this.content.listFaqs()
  }

  @Get("testimonials")
  testimonials() {
    return this.content.listTestimonials()
  }
}

@Controller("admin/content")
@UseGuards(AdminGuard)
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  // --- Features ---

  @Get("features")
  listFeatures() {
    return this.content.listFeatures()
  }

  @Post("features")
  upsertFeature(@Body() dto: UpsertFeatureDto) {
    return this.content.upsertFeature(dto)
  }

  @Delete("features/:id")
  deleteFeature(@Param("id", ParseIntPipe) id: number) {
    return this.content.deleteFeature(id)
  }

  @Post("features/:id/move")
  moveFeature(@Param("id", ParseIntPipe) id: number, @Body() dto: MoveDto) {
    return this.content.moveFeature(id, dto.direction)
  }

  // --- FAQs ---

  @Get("faqs")
  listFaqs() {
    return this.content.listFaqs()
  }

  @Post("faqs")
  upsertFaq(@Body() dto: UpsertFaqDto) {
    return this.content.upsertFaq(dto)
  }

  @Delete("faqs/:id")
  deleteFaq(@Param("id", ParseIntPipe) id: number) {
    return this.content.deleteFaq(id)
  }

  @Post("faqs/:id/move")
  moveFaq(@Param("id", ParseIntPipe) id: number, @Body() dto: MoveDto) {
    return this.content.moveFaq(id, dto.direction)
  }

  // --- Testimonials ---

  @Get("testimonials")
  listTestimonials() {
    return this.content.listTestimonials()
  }

  @Post("testimonials")
  upsertTestimonial(@Body() dto: UpsertTestimonialDto) {
    return this.content.upsertTestimonial(dto)
  }

  @Delete("testimonials/:id")
  deleteTestimonial(@Param("id", ParseIntPipe) id: number) {
    return this.content.deleteTestimonial(id)
  }

  @Post("testimonials/:id/move")
  moveTestimonial(@Param("id", ParseIntPipe) id: number, @Body() dto: MoveDto) {
    return this.content.moveTestimonial(id, dto.direction)
  }
}
