class ConfigsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:create]
  before_action :set_config, only: [:show, :update, :destroy]

  def index
    @configs = Config.order(created_at: :desc).limit(50)
  end

  def show
    @config.increment!(:views_count)
  end

  def create
    @config = Config.new
    @config.name = config_params[:name]
    @config.description = config_params[:description]
    @config.pipeline_data = config_params[:pipeline_data]
    @config.yaml_output = config_params[:yaml_output]
    @config.generate_yaml if @config.yaml_output.blank?

    respond_to do |format|
      if @config.save
        format.html { redirect_to config_path(@config.share_token), notice: "Configuration saved!" }
        format.json { render json: { share_token: @config.share_token, id: @config.id }, status: :created }
      else
        format.html { redirect_to root_path, alert: @config.errors.full_messages.join(", ") }
        format.json { render json: { errors: @config.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @config.destroy
    redirect_to configs_path, notice: "Configuration deleted."
  end

  private

  def set_config
    @config = Config.find_by!(share_token: params[:id])
  end

  def config_params
    params.require(:config).permit(:name, :description, :pipeline_data, :yaml_output)
  end
end
