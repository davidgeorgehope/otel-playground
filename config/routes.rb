Rails.application.routes.draw do
  root "pipeline#builder"

  get "templates", to: "pipeline#templates"
  post "generate_yaml", to: "pipeline#generate_yaml"

  resources :configs, only: [:index, :show, :create, :update, :destroy] do
    member do
      post :upvote
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
