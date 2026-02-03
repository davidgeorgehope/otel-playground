class ConfigsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:create, :upvote]
  before_action :set_config, only: [:show, :update, :destroy, :upvote]

  def index
    @configs = Config.order(created_at: :desc)

    # Search
    if params[:q].present?
      q = "%#{params[:q]}%"
      @configs = @configs.where("name LIKE ? OR description LIKE ?", q, q)
    end

    # Tag filter
    if params[:tag].present?
      @configs = @configs.where("tags LIKE ?", "%\"#{params[:tag]}\"%")
    end

    # Sorting
    case params[:sort]
    when "popular"
      @configs = @configs.reorder(upvotes: :desc, created_at: :desc)
    when "views"
      @configs = @configs.reorder(views_count: :desc, created_at: :desc)
    else
      @configs = @configs.reorder(created_at: :desc)
    end

    @configs = @configs.limit(60)
    @current_sort = params[:sort] || "newest"
    @current_tag = params[:tag]
    @search_query = params[:q]
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
    @config.tags = config_params[:tags] || "[]"
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

  def upvote
    cookie_key = "upvoted_#{@config.id}"
    if cookies[cookie_key].present?
      head :too_many_requests
      return
    end

    @config.increment!(:upvotes)
    cookies[cookie_key] = { value: "1", expires: 1.year.from_now }

    respond_to do |format|
      format.json { render json: { upvotes: @config.upvotes } }
      format.html { redirect_to configs_path }
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
    params.require(:config).permit(:name, :description, :pipeline_data, :yaml_output, :tags)
  end
end
