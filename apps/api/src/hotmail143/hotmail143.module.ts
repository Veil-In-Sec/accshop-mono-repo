import { Module } from "@nestjs/common"

import { Hotmail143Service } from "./hotmail143.service"

@Module({
  providers: [Hotmail143Service],
  exports: [Hotmail143Service],
})
export class Hotmail143Module {}
