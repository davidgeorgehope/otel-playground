class AddGalleryFieldsToConfigs < ActiveRecord::Migration[8.1]
  def change
    add_column :configs, :upvotes, :integer, default: 0, null: false
    add_column :configs, :tags, :text, default: "[]"
  end
end
