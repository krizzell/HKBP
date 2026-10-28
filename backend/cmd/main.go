package main

import (
	"HKBP/internal/config"
	"HKBP/internal/database"
	"HKBP/internal/handler"
	"HKBP/internal/repository"
	"HKBP/internal/router"
	"HKBP/internal/service"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println(".env tidak ditemukan, pakai environment bawaan")
	}

	cfg := config.Load()

	db, err := database.Connect(cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		log.Fatal("gagal konek MongoDB: ", err)
	}
	log.Println("MongoDB terhubung")

	wilayahRepo := repository.NewWilayahRepository(db)
	wilayahSvc := service.NewWilayahService(wilayahRepo)
	wilayahHandler := handler.NewWilayahHandler(wilayahSvc, wilayahRepo)
	authHandler := handler.NewAuthHandler(wilayahSvc, wilayahRepo)

	distrikRepo := repository.NewDistrikRepository(db)
	distrikSvc := service.NewDistrikService(distrikRepo, wilayahRepo)
	distrikHandler := handler.NewDistrikHandler(distrikSvc)

	resortRepo := repository.NewResortRepository(db)
	resortSvc := service.NewResortService(resortRepo, distrikRepo, wilayahRepo)
	resortHandler := handler.NewResortHandler(resortSvc)

	huriaRepo := repository.NewHuriaRepository(db)
	huriaSvc := service.NewHuriaService(huriaRepo, resortRepo, wilayahRepo)
	huriaHandler := handler.NewHuriaHandler(huriaSvc)

	r := router.New(cfg, wilayahHandler, authHandler, distrikHandler, resortHandler, huriaHandler)
	log.Printf("Server backend HKBP V2 berjalan di port %s...\n", cfg.Port)
	log.Fatal(r.Run(":" + cfg.Port))
}
